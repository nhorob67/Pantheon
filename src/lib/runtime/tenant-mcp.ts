import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { CreateMcpServerData, UpdateMcpServerData } from "@/lib/validators/mcp-server";
import type { McpServerConfig } from "@/types/mcp";

const MCP_SERVER_SELECT =
  "id, instance_id, customer_id, server_key, display_name, command, args, env_vars, scope, agent_id, enabled, created_at, updated_at";

interface TenantMcpServerRow {
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
  created_at: string;
  updated_at: string;
}

interface TenantAgentLookupRow {
  id: string;
  legacy_agent_id: string | null;
  status: string;
}

export interface TenantMcpMutationContext {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export class TenantMcpServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeArgs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeEnvVars(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const envVars: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === "string") {
      envVars[key] = rawValue;
    }
  }

  return envVars;
}

function mapMcpServerRow(row: TenantMcpServerRow): McpServerConfig {
  return {
    id: row.id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    server_key: row.server_key,
    display_name: row.display_name,
    command: row.command,
    args: normalizeArgs(row.args),
    env_vars: normalizeEnvVars(row.env_vars),
    scope: row.scope === "agent" ? "agent" : "instance",
    agent_id: row.agent_id,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function requireLegacyInstanceId(context: TenantMcpMutationContext): string {
  if (!context.legacyInstanceId) {
    throw new TenantMcpServiceError(
      409,
      "No active legacy instance mapping available for tenant MCP server operations"
    );
  }

  return context.legacyInstanceId;
}

async function resolveLegacyAgentId(
  admin: SupabaseClient,
  context: TenantMcpMutationContext,
  requestedAgentId: string
): Promise<string> {
  const legacyInstanceId = requireLegacyInstanceId(context);

  const { data: directLegacyAgent, error: directLegacyError } = await admin
    .from("agents")
    .select("id")
    .eq("id", requestedAgentId)
    .eq("instance_id", legacyInstanceId)
    .maybeSingle();

  if (directLegacyError) {
    throw new TenantMcpServiceError(
      500,
      safeErrorMessage(directLegacyError, "Failed to resolve MCP legacy agent")
    );
  }

  if (directLegacyAgent) {
    return requestedAgentId;
  }

  const { data: tenantAgent, error: tenantAgentError } = await admin
    .from("tenant_agents")
    .select("id, legacy_agent_id, status")
    .eq("tenant_id", context.tenantId)
    .or(`id.eq.${requestedAgentId},legacy_agent_id.eq.${requestedAgentId}`)
    .maybeSingle();

  if (tenantAgentError) {
    throw new TenantMcpServiceError(
      500,
      safeErrorMessage(tenantAgentError, "Failed to resolve MCP tenant agent")
    );
  }

  const row = (tenantAgent as TenantAgentLookupRow | null) || null;
  if (!row || row.status === "archived") {
    throw new TenantMcpServiceError(400, "Agent not found");
  }

  if (!row.legacy_agent_id) {
    throw new TenantMcpServiceError(
      400,
      "Agent mapping unavailable for legacy MCP server scope"
    );
  }

  return row.legacy_agent_id;
}

function normalizeScope(value: string | undefined): "instance" | "agent" {
  return value === "agent" ? "agent" : "instance";
}

async function fetchMcpServerById(
  admin: SupabaseClient,
  context: TenantMcpMutationContext,
  serverId: string
): Promise<TenantMcpServerRow | null> {
  const legacyInstanceId = requireLegacyInstanceId(context);

  const { data, error } = await admin
    .from("mcp_server_configs")
    .select(MCP_SERVER_SELECT)
    .eq("id", serverId)
    .eq("instance_id", legacyInstanceId)
    .maybeSingle();

  if (error) {
    throw new TenantMcpServiceError(
      500,
      safeErrorMessage(error, "Failed to load MCP server")
    );
  }

  return (data as TenantMcpServerRow | null) || null;
}

function mapConstraintError(error: unknown, fallbackMessage: string): TenantMcpServiceError {
  const maybeError = error as { code?: string };
  if (maybeError?.code === "23505") {
    return new TenantMcpServiceError(409, "A server with this key already exists");
  }

  if (maybeError?.code === "23503") {
    return new TenantMcpServiceError(400, "Agent not found");
  }

  return new TenantMcpServiceError(
    500,
    safeErrorMessage(error, fallbackMessage)
  );
}

export function buildTenantMcpContext(
  tenantId: string,
  customerId: string,
  legacyInstanceId: string | null
): TenantMcpMutationContext {
  return {
    tenantId,
    customerId,
    legacyInstanceId,
  };
}

export async function listTenantMcpServers(
  admin: SupabaseClient,
  context: TenantMcpMutationContext
): Promise<McpServerConfig[]> {
  const legacyInstanceId = requireLegacyInstanceId(context);

  const { data, error } = await admin
    .from("mcp_server_configs")
    .select(MCP_SERVER_SELECT)
    .eq("instance_id", legacyInstanceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new TenantMcpServiceError(
      500,
      safeErrorMessage(error, "Failed to list tenant MCP servers")
    );
  }

  return ((data || []) as TenantMcpServerRow[]).map(mapMcpServerRow);
}

export async function createTenantMcpServer(
  admin: SupabaseClient,
  context: TenantMcpMutationContext,
  data: CreateMcpServerData
): Promise<McpServerConfig> {
  const legacyInstanceId = requireLegacyInstanceId(context);
  const scope = normalizeScope(data.scope);
  const agentId =
    scope === "agent" && data.agent_id
      ? await resolveLegacyAgentId(admin, context, data.agent_id)
      : null;

  const { data: created, error } = await admin
    .from("mcp_server_configs")
    .insert({
      instance_id: legacyInstanceId,
      customer_id: context.customerId,
      server_key: data.server_key,
      display_name: data.display_name,
      command: data.command,
      args: data.args,
      env_vars: data.env_vars,
      scope,
      agent_id: scope === "agent" ? agentId : null,
      enabled: data.enabled,
    })
    .select(MCP_SERVER_SELECT)
    .single();

  if (error || !created) {
    throw mapConstraintError(error, "Failed to create tenant MCP server");
  }

  return mapMcpServerRow(created as TenantMcpServerRow);
}

export async function updateTenantMcpServer(
  admin: SupabaseClient,
  context: TenantMcpMutationContext,
  serverId: string,
  data: UpdateMcpServerData
): Promise<McpServerConfig> {
  const existing = await fetchMcpServerById(admin, context, serverId);
  if (!existing) {
    throw new TenantMcpServiceError(404, "MCP server not found");
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.server_key !== undefined) {
    updatePayload["server_key"] = data.server_key;
  }
  if (data.display_name !== undefined) {
    updatePayload["display_name"] = data.display_name;
  }
  if (data.command !== undefined) {
    updatePayload["command"] = data.command;
  }
  if (data.args !== undefined) {
    updatePayload["args"] = data.args;
  }
  if (data.env_vars !== undefined) {
    updatePayload["env_vars"] = data.env_vars;
  }
  if (data.enabled !== undefined) {
    updatePayload["enabled"] = data.enabled;
  }

  const nextScope = normalizeScope(data.scope ?? existing.scope);
  updatePayload["scope"] = nextScope;

  if (nextScope === "instance") {
    updatePayload["agent_id"] = null;
  } else if (data.agent_id !== undefined) {
    updatePayload["agent_id"] = data.agent_id
      ? await resolveLegacyAgentId(admin, context, data.agent_id)
      : null;
  }

  const { data: updated, error } = await admin
    .from("mcp_server_configs")
    .update(updatePayload)
    .eq("id", existing.id)
    .eq("instance_id", existing.instance_id)
    .select(MCP_SERVER_SELECT)
    .maybeSingle();

  if (error || !updated) {
    throw mapConstraintError(error, "Failed to update tenant MCP server");
  }

  return mapMcpServerRow(updated as TenantMcpServerRow);
}

export async function deleteTenantMcpServer(
  admin: SupabaseClient,
  context: TenantMcpMutationContext,
  serverId: string
): Promise<void> {
  const existing = await fetchMcpServerById(admin, context, serverId);
  if (!existing) {
    throw new TenantMcpServiceError(404, "MCP server not found");
  }

  const { error } = await admin
    .from("mcp_server_configs")
    .delete()
    .eq("id", existing.id)
    .eq("instance_id", existing.instance_id);

  if (error) {
    throw new TenantMcpServiceError(
      500,
      safeErrorMessage(error, "Failed to delete tenant MCP server")
    );
  }
}
