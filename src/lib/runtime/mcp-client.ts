/**
 * MCP Runtime Client
 *
 * Manages MCP server connections, tool discovery, and tool execution.
 * Supports both stdio (local process) and SSE (remote HTTP) transports.
 *
 * Connection lifecycle:
 *   connect → discover tools → cache → execute → health check → disconnect
 *
 * Connections are cached per server and reused across agent runs within the
 * same process. Each connection has an inactivity timeout and automatic
 * reconnection on failure.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { McpServerConfig } from "@/types/mcp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toMcpToolKey } from "./mcp-tool-keys";

// Re-export naming utilities for convenience
export { toMcpToolKey, parseMcpToolKey } from "./mcp-tool-keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpConnectionState {
  serverId: string;
  serverKey: string;
  client: Client | null;
  transport: StdioClientTransport | SSEClientTransport | null;
  status: "disconnected" | "connecting" | "connected" | "error";
  lastConnected: number | null;
  lastError: string | null;
  toolCount: number;
}

interface McpDiscoveredToolRow {
  id: string;
  tool_name: string;
  display_name: string;
  description: string | null;
  input_schema: unknown;
  blocked: boolean;
  risk_level_override: string | null;
}

export interface McpToolDefinition {
  serverKey: string;
  serverId: string;
  toolName: string;
  displayName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  blocked: boolean;
  riskLevelOverride: string | null;
}

interface McpObservabilityContext {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Max time a connection can sit idle before being cleaned up */
const CONNECTION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Max time to wait for a connection to establish */
const CONNECTION_TIMEOUT_MS = 15_000; // 15 seconds

/** Max time to wait for a tool execution */
const TOOL_EXECUTION_TIMEOUT_MS = 30_000; // 30 seconds

/** How often to check for idle connections */
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// Connection pool (in-process singleton)
// ---------------------------------------------------------------------------

const connectionPool = new Map<string, McpConnectionState>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, state] of connectionPool) {
      if (
        state.status === "connected" &&
        state.lastConnected &&
        now - state.lastConnected > CONNECTION_IDLE_TIMEOUT_MS
      ) {
        disconnectServer(key).catch(() => {});
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// Connect / Disconnect
// ---------------------------------------------------------------------------

/**
 * Connect to an MCP server and discover its tools. Returns the connection state.
 * If already connected, returns the existing connection.
 */
export async function connectMcpServer(
  config: McpServerConfig,
  observability?: McpObservabilityContext
): Promise<McpConnectionState> {
  const poolKey = config.id;
  const existing = connectionPool.get(poolKey);
  const wasReconnecting = Boolean(existing && existing.status !== "connected");

  if (existing?.status === "connected" && existing.client) {
    existing.lastConnected = Date.now();
    return existing;
  }

  const state: McpConnectionState = {
    serverId: config.id,
    serverKey: config.server_key,
    client: null,
    transport: null,
    status: "connecting",
    lastConnected: null,
    lastError: null,
    toolCount: 0,
  };
  connectionPool.set(poolKey, state);
  startCleanupTimer();

  try {
    const transport = buildTransport(config);
    const client = new Client(
      { name: `pantheon-${config.server_key}`, version: "1.0.0" },
      { capabilities: {} }
    );

    await withTimeout(
      client.connect(transport),
      CONNECTION_TIMEOUT_MS,
      `MCP connection to "${config.server_key}" timed out after ${CONNECTION_TIMEOUT_MS}ms`
    );

    state.client = client;
    state.transport = transport;
    state.status = "connected";
    state.lastConnected = Date.now();
    state.lastError = null;

    if (observability) {
      await updateServerHealth(observability.admin, config.id, {
        health_status: "healthy",
        last_error: null,
      });
      await recordHealthEvent(
        observability.admin,
        config,
        observability.tenantId,
        observability.customerId,
        wasReconnecting ? "reconnected" : "connection_success",
        {}
      );
    }

    return state;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Connection failed";
    state.status = "error";
    state.lastError = errorMessage;
    state.client = null;
    state.transport = null;
    if (observability) {
      await updateServerHealth(observability.admin, config.id, {
        health_status: "unreachable",
        last_error: errorMessage,
      });
      await recordHealthEvent(
        observability.admin,
        config,
        observability.tenantId,
        observability.customerId,
        "connection_failure",
        { error: errorMessage }
      );
    }
    throw err;
  }
}

/**
 * Disconnect from an MCP server and remove from pool.
 */
export async function disconnectServer(
  poolKeyOrServerId: string,
  observability?: McpObservabilityContext
): Promise<void> {
  const state = connectionPool.get(poolKeyOrServerId);
  if (!state) return;

  try {
    if (state.client) {
      await state.client.close();
    }
  } catch {
    // Ignore close errors
  } finally {
    state.status = "disconnected";
    state.client = null;
    state.transport = null;
    connectionPool.delete(poolKeyOrServerId);
    if (observability) {
      await recordHealthEvent(
        observability.admin,
        {
          id: state.serverId,
          server_key: state.serverKey,
        } as McpServerConfig,
        observability.tenantId,
        observability.customerId,
        "disconnected",
        {}
      );
    }
  }
}

/**
 * Disconnect all MCP servers. Used during shutdown.
 */
export async function disconnectAll(): Promise<void> {
  const promises = Array.from(connectionPool.keys()).map((key) =>
    disconnectServer(key)
  );
  await Promise.allSettled(promises);
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Tool Discovery
// ---------------------------------------------------------------------------

/**
 * Discover tools from an MCP server, cache them in the database, and register
 * them in tenant_tools + tenant_tool_policies for policy evaluation.
 *
 * Returns the list of discovered tools.
 */
export async function discoverMcpTools(
  admin: SupabaseClient,
  config: McpServerConfig,
  tenantId: string,
  customerId: string
): Promise<McpToolDefinition[]> {
  const state = await connectMcpServer(config, { admin, tenantId, customerId });
  if (!state.client) {
    throw new Error(`MCP server "${config.server_key}" is not connected`);
  }

  try {
    // List tools from the MCP server
    const result = await state.client.listTools();
    const tools = result.tools || [];

    state.toolCount = tools.length;

    // Upsert discovered tools into cache table
    if (tools.length > 0) {
      const rows = tools.map((t) => ({
        server_id: config.id,
        tenant_id: tenantId,
        customer_id: customerId,
        tool_name: t.name,
        display_name: t.name,
        description: t.description || null,
        input_schema: t.inputSchema || {},
        discovered_at: new Date().toISOString(),
      }));

      for (const row of rows) {
        await admin
          .from("mcp_discovered_tools")
          .upsert(row, { onConflict: "server_id,tool_name" });
      }
    }

    // Remove tools that no longer exist on the server
    const currentToolNames = tools.map((t) => t.name);
    if (currentToolNames.length > 0) {
      const { data: allCached } = await admin
        .from("mcp_discovered_tools")
        .select("id, tool_name")
        .eq("server_id", config.id);

      const staleIds = ((allCached || []) as Array<{ id: string; tool_name: string }>)
        .filter((r) => !currentToolNames.includes(r.tool_name))
        .map((r) => r.id);

      if (staleIds.length > 0) {
        await admin
          .from("mcp_discovered_tools")
          .delete()
          .in("id", staleIds);
      }
    }

    // Update server health
    await admin
      .from("mcp_server_configs")
      .update({
        health_status: "healthy",
        last_health_check: new Date().toISOString(),
        last_error: null,
        tools_discovered_at: new Date().toISOString(),
        tool_count: tools.length,
      })
      .eq("id", config.id);

    // Register tools in tenant_tools for policy evaluation
    await ensureMcpTenantToolCatalog(
      admin,
      tenantId,
      customerId,
      config.server_key,
      tools.map((t) => ({
        toolName: t.name,
        description: t.description || `MCP tool from ${config.display_name}`,
      }))
    );

    // Record health event
    await recordHealthEvent(admin, config, tenantId, customerId, "tool_discovery_success", {
      tool_count: tools.length,
      tool_names: currentToolNames,
    });

    // Fetch the full discovered tools (including blocked/override status)
    return loadCachedMcpTools(admin, config.id, config.server_key);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Tool discovery failed";

    await admin
      .from("mcp_server_configs")
      .update({
        health_status: "unhealthy",
        last_health_check: new Date().toISOString(),
        last_error: errorMessage,
      })
      .eq("id", config.id);

    await recordHealthEvent(admin, config, tenantId, customerId, "tool_discovery_failure", {
      error: errorMessage,
    });

    throw err;
  }
}

/**
 * Load cached MCP tools from the database without reconnecting to the server.
 * Used when the cache is still fresh.
 */
export async function loadCachedMcpTools(
  admin: SupabaseClient,
  serverId: string,
  serverKey: string
): Promise<McpToolDefinition[]> {
  const { data, error } = await admin
    .from("mcp_discovered_tools")
    .select("id, tool_name, display_name, description, input_schema, blocked, risk_level_override")
    .eq("server_id", serverId)
    .eq("blocked", false);

  if (error) {
    console.warn(`[mcp-client] Failed to load cached tools for server ${serverKey}:`, error.message);
    return [];
  }

  return ((data || []) as McpDiscoveredToolRow[]).map((row) => ({
    serverKey,
    serverId,
    toolName: row.tool_name,
    displayName: row.display_name,
    description: row.description || `MCP tool from server "${serverKey}"`,
    inputSchema: (row.input_schema as Record<string, unknown>) || {},
    blocked: row.blocked,
    riskLevelOverride: row.risk_level_override,
  }));
}

// ---------------------------------------------------------------------------
// Tool Execution
// ---------------------------------------------------------------------------

/**
 * Execute a tool on an MCP server. The server must already be connected.
 * Returns the raw result from the MCP server.
 */
export async function executeMcpTool(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; output: Record<string, unknown>; error?: string }> {
  let state = connectionPool.get(config.id);

  if (!state?.client || state.status !== "connected") {
    // Try to reconnect
    try {
      state = await connectMcpServer(config, { admin, tenantId, customerId });
    } catch (err) {
      const errorMessage = `MCP server "${config.server_key}" is not available: ${err instanceof Error ? err.message : "connection failed"}`;
      await updateServerHealth(admin, config.id, {
        health_status: "unreachable",
        last_error: errorMessage,
      });
      await recordHealthEvent(admin, config, tenantId, customerId, "tool_execution_failure", {
        tool_name: toolName,
        duration_ms: 0,
        error: errorMessage,
      });
      return {
        success: false,
        output: {},
        error: errorMessage,
      };
    }
  }

  if (!state?.client) {
    const errorMessage = `MCP server "${config.server_key}" connection lost`;
    await updateServerHealth(admin, config.id, {
      health_status: "degraded",
      last_error: errorMessage,
    });
    await recordHealthEvent(admin, config, tenantId, customerId, "tool_execution_failure", {
      tool_name: toolName,
      duration_ms: 0,
      error: errorMessage,
    });
    return {
      success: false,
      output: {},
      error: errorMessage,
    };
  }

  const start = Date.now();

  try {
    const result = await withTimeout(
      state.client.callTool({ name: toolName, arguments: args }),
      TOOL_EXECUTION_TIMEOUT_MS,
      `MCP tool "${toolName}" on server "${config.server_key}" timed out after ${TOOL_EXECUTION_TIMEOUT_MS}ms`
    );

    // MCP callTool returns { content: Array<{type, text}>, isError?: boolean }
    const content = result.content;
    const isError = result.isError;

    const textParts = Array.isArray(content)
      ? content
          .filter((c): c is { type: string; text: string } =>
            typeof c === "object" && c !== null && "text" in c
          )
          .map((c) => c.text)
      : [];

    const outputText = textParts.join("\n");

    // Try to parse as JSON, fall back to raw text
    let output: Record<string, unknown>;
    try {
      const parsed = JSON.parse(outputText);
      output = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed
        : { result: parsed };
    } catch {
      output = { result: outputText };
    }

    if (isError) {
      await updateServerHealth(admin, config.id, {
        health_status: "degraded",
        last_error: outputText || "MCP tool returned an error",
      });
      await recordHealthEvent(admin, config, tenantId, customerId, "tool_execution_failure", {
        tool_name: toolName,
        duration_ms: Date.now() - start,
        error: outputText || "MCP tool returned an error",
      });
      return {
        success: false,
        output,
        error: outputText || "MCP tool returned an error",
      };
    }

    await updateServerHealth(admin, config.id, {
      health_status: "healthy",
      last_error: null,
    });
    await recordHealthEvent(admin, config, tenantId, customerId, "tool_execution_success", {
      tool_name: toolName,
      duration_ms: Date.now() - start,
    });
    return { success: true, output };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : "Tool execution failed";

    // If it's a timeout or connection error, mark server as degraded
    if (durationMs >= TOOL_EXECUTION_TIMEOUT_MS || errorMessage.includes("connection")) {
      const poolState = connectionPool.get(config.id);
      if (poolState) {
        poolState.status = "error";
        poolState.lastError = errorMessage;
      }
    }

    await updateServerHealth(admin, config.id, {
      health_status: durationMs >= TOOL_EXECUTION_TIMEOUT_MS || errorMessage.includes("connection")
        ? "unreachable"
        : "degraded",
      last_error: errorMessage,
    });
    await recordHealthEvent(admin, config, tenantId, customerId, "tool_execution_failure", {
      tool_name: toolName,
      duration_ms: durationMs,
      error: errorMessage,
    });

    return { success: false, output: {}, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * Perform a health check on an MCP server. Attempts to connect (if not already)
 * and list tools. Updates the server's health status in the database.
 */
export async function healthCheckMcpServer(
  admin: SupabaseClient,
  config: McpServerConfig,
  tenantId: string,
  customerId: string
): Promise<{ healthy: boolean; toolCount: number; error?: string }> {
  try {
    const state = await connectMcpServer(config, { admin, tenantId, customerId });
    if (!state.client) {
      throw new Error("Connection established but client is null");
    }

    // List tools as a health signal
    const result = await state.client.listTools();
    const toolCount = (result.tools || []).length;

    await admin
      .from("mcp_server_configs")
      .update({
        health_status: "healthy",
        last_health_check: new Date().toISOString(),
        last_error: null,
        tool_count: toolCount,
      })
      .eq("id", config.id);

    await recordHealthEvent(admin, config, tenantId, customerId, "health_check_success", {
      tool_count: toolCount,
    });

    return { healthy: true, toolCount };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Health check failed";

    await admin
      .from("mcp_server_configs")
      .update({
        health_status: "unreachable",
        last_health_check: new Date().toISOString(),
        last_error: errorMessage,
      })
      .eq("id", config.id);

    await recordHealthEvent(admin, config, tenantId, customerId, "health_check_failure", {
      error: errorMessage,
    });

    return { healthy: false, toolCount: 0, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// Tenant Tool Catalog Registration
// ---------------------------------------------------------------------------

const ALL_TENANT_ROLES = ["owner", "admin", "operator", "viewer"];

interface McpToolCatalogEntry {
  toolName: string;
  description: string;
}

/**
 * Register MCP tools in tenant_tools + tenant_tool_policies so they participate
 * in the unified policy evaluation pipeline. Uses the `mcp.{server_key}.{tool_name}`
 * namespace convention from the external tool integration strategy.
 */
async function ensureMcpTenantToolCatalog(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  serverKey: string,
  tools: McpToolCatalogEntry[]
): Promise<void> {
  if (tools.length === 0) return;

  const toolKeys = tools.map((t) => toMcpToolKey(serverKey, t.toolName));

  // Check which tools already exist
  const { data: existing } = await admin
    .from("tenant_tools")
    .select("id, tool_key")
    .eq("tenant_id", tenantId)
    .in("tool_key", toolKeys);

  const existingKeys = new Set(
    ((existing || []) as Array<{ id: string; tool_key: string }>).map((r) => r.tool_key)
  );

  const missing = tools.filter((t) => !existingKeys.has(toMcpToolKey(serverKey, t.toolName)));

  if (missing.length === 0) return;

  // Insert missing tool rows
  const { data: inserted, error: insertError } = await admin
    .from("tenant_tools")
    .insert(
      missing.map((t) => ({
        tenant_id: tenantId,
        customer_id: customerId,
        tool_key: toMcpToolKey(serverKey, t.toolName),
        display_name: t.toolName,
        description: t.description,
        status: "enabled",
        risk_level: "high", // MCP tools are high-risk by default (user-provided code)
        config: {},
        metadata: {
          provider: "mcp",
          mcp_server_key: serverKey,
          mcp_tool_name: t.toolName,
          runtime_kind: "external_mcp",
        },
      }))
    )
    .select("id, tool_key");

  if (insertError && insertError.code !== "23505") {
    console.error("[mcp-client] Failed to register MCP tools:", insertError.message);
    return;
  }

  // Insert policies for new tools
  const insertedRows = (inserted || []) as Array<{ id: string; tool_key: string }>;
  if (insertedRows.length > 0) {
    const { error: policyError } = await admin
      .from("tenant_tool_policies")
      .insert(
        insertedRows.map((r) => ({
          tenant_id: tenantId,
          customer_id: customerId,
          tool_id: r.id,
          approval_mode: "none",
          allow_roles: ALL_TENANT_ROLES,
          max_calls_per_hour: 60,
          timeout_ms: 30000,
          metadata: { seeded_by: "mcp_tool_discovery" },
        }))
      );

    if (policyError && policyError.code !== "23505") {
      console.error("[mcp-client] Failed to create MCP tool policies:", policyError.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// toMcpToolKey and parseMcpToolKey are re-exported from ./mcp-tool-keys above

function buildTransport(config: McpServerConfig): StdioClientTransport | SSEClientTransport {
  if (config.transport === "sse" && config.url) {
    return new SSEClientTransport(new URL(config.url), {
      requestInit: {
        headers: config.headers || {},
      },
    });
  }

  // stdio transport — filter out undefined env values
  const envVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) envVars[k] = v;
  }
  Object.assign(envVars, config.env_vars);

  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: envVars,
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function recordHealthEvent(
  admin: SupabaseClient,
  config: McpServerConfig,
  tenantId: string,
  customerId: string,
  eventType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await admin.from("mcp_server_health_events").insert({
      server_id: config.id,
      tenant_id: tenantId,
      customer_id: customerId,
      event_type: eventType,
      message: metadata.error ? String(metadata.error) : null,
      metadata,
    });
  } catch {
    // Best-effort — don't fail the parent operation
  }
}

async function updateServerHealth(
  admin: SupabaseClient,
  serverId: string,
  updates: Partial<Pick<McpServerConfig, "health_status" | "last_error" | "last_health_check" | "tool_count" | "tools_discovered_at">>
): Promise<void> {
  try {
    await admin
      .from("mcp_server_configs")
      .update(updates)
      .eq("id", serverId);
  } catch {
    // Best-effort — don't fail the parent operation
  }
}

/** Reset connection pool (for testing). */
export function _resetConnectionPool(): void {
  connectionPool.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
