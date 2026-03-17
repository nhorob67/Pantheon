/**
 * MCP Tool Hydration
 *
 * Discovers tools from tenant-approved MCP servers and creates AI SDK tool
 * wrappers that route through the unified execution pipeline. Each MCP tool
 * is registered in tenant_tools for policy evaluation and shows up in the
 * same trace/audit/observability surfaces as native and Composio tools.
 *
 * Tool key convention: `mcp.{server_key}.{tool_name}`
 */

import { tool, jsonSchema, type ToolSet } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServerConfig } from "@/types/mcp";
import {
  discoverMcpTools,
  loadCachedMcpTools,
  executeMcpTool,
  toMcpToolKey,
  type McpToolDefinition,
} from "@/lib/runtime/mcp-client";
import { decryptMcpSecrets } from "@/lib/runtime/mcp-secrets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateMcpToolsInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  /** Only include MCP servers scoped to this agent (or instance-wide servers) */
  agentId: string | null;
  legacyInstanceId: string | null;
}

export interface McpToolSetResult {
  tools: ToolSet;
  keyMap: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Cache freshness
// ---------------------------------------------------------------------------

/** Tools discovered within this window are considered fresh — skip re-discovery */
const TOOL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isCacheFresh(server: McpServerConfig): boolean {
  if (!server.tools_discovered_at) return false;
  const discoveredAt = new Date(server.tools_discovered_at).getTime();
  return Date.now() - discoveredAt < TOOL_CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create AI SDK tools for all enabled MCP servers available to an agent.
 *
 * For each server:
 * 1. Load cached tools if fresh, otherwise reconnect and discover.
 * 2. Filter out blocked tools.
 * 3. Create AI SDK tool wrappers that execute via the MCP client.
 *
 * Returns tools keyed by their original MCP tool name (not the namespaced key)
 * so the AI model sees clean names. The namespaced key is used internally for
 * policy evaluation via the unified executor.
 */
export async function createMcpTools(
  input: CreateMcpToolsInput
): Promise<McpToolSetResult> {
  const servers = await loadEnabledMcpServers(
    input.admin,
    input.legacyInstanceId,
    input.agentId
  );

  if (servers.length === 0) return { tools: {}, keyMap: new Map() };

  const allTools: ToolSet = {};
  const keyMap = new Map<string, string>();

  for (const server of servers) {
    try {
      const tools = await resolveServerTools(input.admin, server, input.tenantId, input.customerId);

      for (const toolDef of tools) {
        if (toolDef.blocked) continue;

        // Use a namespaced key for the AI model to avoid collisions between servers
        const modelToolName = `mcp_${server.server_key}_${toolDef.toolName}`;

        allTools[modelToolName] = createMcpToolWrapper(
          input.admin,
          input.tenantId,
          input.customerId,
          server,
          toolDef
        );
        keyMap.set(modelToolName, toMcpToolKey(server.server_key, toolDef.toolName));
      }
    } catch (err) {
      // Graceful degradation: log and skip this server
      console.warn(
        `[mcp-tools] Failed to hydrate tools from MCP server "${server.server_key}":`,
        err instanceof Error ? err.message : "unknown error"
      );
    }
  }

  return { tools: allTools, keyMap };
}

// ---------------------------------------------------------------------------
// Server loading
// ---------------------------------------------------------------------------

interface McpServerRow {
  id: string;
  instance_id: string;
  customer_id: string;
  server_key: string;
  display_name: string;
  command: string;
  args: unknown;
  env_vars: unknown;
  scope: string;
  agent_id: string | null;
  enabled: boolean;
  transport: string;
  url: string | null;
  headers: unknown;
  health_status: string;
  last_health_check: string | null;
  last_error: string | null;
  tools_discovered_at: string | null;
  tool_count: number;
  created_at: string;
  updated_at: string;
}

async function loadEnabledMcpServers(
  admin: SupabaseClient,
  legacyInstanceId: string | null,
  agentId: string | null
): Promise<McpServerConfig[]> {
  if (!legacyInstanceId) return [];

  const { data, error } = await admin
    .from("mcp_server_configs")
    .select("*")
    .eq("instance_id", legacyInstanceId)
    .eq("enabled", true);

  if (error) {
    console.warn("[mcp-tools] Failed to load MCP servers:", error.message);
    return [];
  }

  const rows = (data || []) as McpServerRow[];

  // Filter by scope: include instance-wide servers + agent-specific servers for this agent
  return rows
    .filter((row) => {
      if (row.scope === "instance") return true;
      if (row.scope === "agent" && agentId && row.agent_id === agentId) return true;
      return false;
    })
    .map(mapServerRow);
}

function mapServerRow(row: McpServerRow): McpServerConfig {
  return {
    id: row.id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    server_key: row.server_key,
    display_name: row.display_name,
    command: row.command,
    args: normalizeArgs(row.args),
    env_vars: decryptMcpSecrets(normalizeEnvVars(row.env_vars)),
    scope: row.scope === "agent" ? "agent" : "instance",
    agent_id: row.agent_id,
    enabled: row.enabled,
    transport: row.transport === "sse" ? "sse" : "stdio",
    url: row.url,
    headers: decryptMcpSecrets(normalizeEnvVars(row.headers)),
    health_status: row.health_status as McpServerConfig["health_status"],
    last_health_check: row.last_health_check,
    last_error: row.last_error,
    tools_discovered_at: row.tools_discovered_at,
    tool_count: row.tool_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeArgs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function normalizeEnvVars(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") result[k] = v;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tool resolution (cached or fresh discovery)
// ---------------------------------------------------------------------------

async function resolveServerTools(
  admin: SupabaseClient,
  server: McpServerConfig,
  tenantId: string,
  customerId: string
): Promise<McpToolDefinition[]> {
  // Use cached tools if the cache is fresh
  if (isCacheFresh(server)) {
    const cached = await loadCachedMcpTools(admin, server.id, server.server_key);
    if (cached.length > 0) return cached;
  }

  // Otherwise, reconnect and discover
  return discoverMcpTools(admin, server, tenantId, customerId);
}

// ---------------------------------------------------------------------------
// AI SDK Tool Wrapper
// ---------------------------------------------------------------------------

/**
 * Create an AI SDK tool wrapper for a single MCP tool.
 * The wrapper executes the tool via the MCP client and returns the result.
 *
 * Policy enforcement happens upstream in the unified executor — this wrapper
 * is just the raw execution layer.
 */
function createMcpToolWrapper(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  server: McpServerConfig,
  toolDef: McpToolDefinition
): ToolSet[string] {
  // MCP tools have dynamic schemas that vary per server.
  // Accept arbitrary JSON inputs — the MCP server validates internally.
  return tool({
    description: buildToolDescription(server, toolDef),
    inputSchema: jsonSchema<Record<string, unknown>>({
      type: "object",
      additionalProperties: true,
    }),
    execute: async (args: Record<string, unknown>) => {
      const result = await executeMcpTool(
        admin,
        tenantId,
        customerId,
        server,
        toolDef.toolName,
        args || {}
      );

      if (!result.success) {
        return {
          error: result.error || "MCP tool execution failed",
          server: server.server_key,
          tool: toolDef.toolName,
        };
      }

      return result.output;
    },
  });
}

function buildToolDescription(server: McpServerConfig, toolDef: McpToolDefinition): string {
  const base = toolDef.description || `Tool from MCP server "${server.display_name}"`;
  return `${base} (via MCP server: ${server.display_name})`;
}

/**
 * Get the MCP tool key map for a set of MCP tools. Maps model-facing tool names
 * to their namespaced tenant_tools keys for policy evaluation.
 */
export function buildMcpToolKeyMap(
  servers: McpServerConfig[],
  toolDefs: McpToolDefinition[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of toolDefs) {
    const modelName = `mcp_${def.serverKey}_${def.toolName}`;
    const policyKey = toMcpToolKey(def.serverKey, def.toolName);
    map.set(modelName, policyKey);
  }
  return map;
}
