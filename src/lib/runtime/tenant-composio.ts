import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComposioClient, ComposioOAuthResult } from "@/lib/composio/client";
import { buildComposioUserId } from "@/lib/composio/user-id";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";

const COMPOSIO_SELECT =
  "id, customer_id, instance_id, composio_user_id, enabled, selected_toolkits, connected_apps, mcp_server_url, composio_server_id, last_sync_at, created_at, updated_at";

interface ComposioConfigRow {
  id: string;
  customer_id: string;
  instance_id: string | null;
  composio_user_id: string;
  enabled: boolean;
  selected_toolkits: unknown;
  connected_apps: unknown;
  mcp_server_url: string | null;
  composio_server_id: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantComposioMutationContext {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export class TenantComposioServiceError extends Error {
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function mapConnectedStatus(
  value: unknown
): ComposioConnectedApp["status"] {
  if (value === "connected" || value === "disconnected" || value === "expired" || value === "pending") {
    return value;
  }

  return "disconnected";
}

function normalizeConnectedApps(value: unknown): ComposioConnectedApp[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const apps: ComposioConnectedApp[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.app_id !== "string" ||
      typeof entry.app_name !== "string"
    ) {
      continue;
    }

    apps.push({
      id: entry.id,
      app_id: entry.app_id,
      app_name: entry.app_name,
      status: mapConnectedStatus(entry.status),
      account_identifier:
        typeof entry.account_identifier === "string" ? entry.account_identifier : null,
      connected_at: typeof entry.connected_at === "string" ? entry.connected_at : null,
    });
  }

  return apps;
}

function mapComposioRow(row: ComposioConfigRow): ComposioConfig {
  return {
    id: row.id,
    customer_id: row.customer_id,
    instance_id: row.instance_id,
    composio_user_id: row.composio_user_id,
    enabled: row.enabled,
    selected_toolkits: toStringArray(row.selected_toolkits),
    connected_apps: normalizeConnectedApps(row.connected_apps),
    mcp_server_url: row.mcp_server_url,
    composio_server_id: row.composio_server_id,
    last_sync_at: row.last_sync_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAccountStatus(
  status: "ACTIVE" | "EXPIRED" | "FAILED" | "INITIATED"
): ComposioConnectedApp["status"] {
  if (status === "ACTIVE") {
    return "connected";
  }

  if (status === "EXPIRED") {
    return "expired";
  }

  if (status === "INITIATED") {
    return "pending";
  }

  return "disconnected";
}

async function fetchComposioConfig(
  admin: SupabaseClient,
  context: TenantComposioMutationContext
): Promise<ComposioConfigRow | null> {
  const { data, error } = await admin
    .from("composio_configs")
    .select(COMPOSIO_SELECT)
    .eq("customer_id", context.customerId)
    .maybeSingle();

  if (error) {
    throw new TenantComposioServiceError(
      500,
      safeErrorMessage(error, "Failed to load tenant Composio config")
    );
  }

  return (data as ComposioConfigRow | null) || null;
}

export function buildTenantComposioContext(
  tenantId: string,
  customerId: string,
  legacyInstanceId: string | null
): TenantComposioMutationContext {
  return {
    tenantId,
    customerId,
    legacyInstanceId,
  };
}

export async function getTenantComposioConfig(
  admin: SupabaseClient,
  context: TenantComposioMutationContext
): Promise<ComposioConfig | null> {
  const row = await fetchComposioConfig(admin, context);
  return row ? mapComposioRow(row) : null;
}

export async function enableTenantComposioIntegration(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  composio: ComposioClient
): Promise<ComposioConfig> {
  const existing = await fetchComposioConfig(admin, context);
  if (existing) {
    throw new TenantComposioServiceError(
      409,
      "Composio integration already configured"
    );
  }

  const composioUserId = buildComposioUserId(context.customerId);
  let mcpServer: { server_id: string; url: string };

  try {
    await composio.createEntity(composioUserId);
    mcpServer = await composio.getMcpUrl(composioUserId);
  } catch (error) {
    throw new TenantComposioServiceError(
      502,
      safeErrorMessage(error, "Failed to provision Composio integration")
    );
  }

  const { data, error } = await admin
    .from("composio_configs")
    .insert({
      customer_id: context.customerId,
      instance_id: context.legacyInstanceId,
      composio_user_id: composioUserId,
      enabled: true,
      mcp_server_url: mcpServer.url,
      composio_server_id: mcpServer.server_id,
    })
    .select(COMPOSIO_SELECT)
    .single();

  if (error || !data) {
    throw new TenantComposioServiceError(
      500,
      safeErrorMessage(error, "Failed to create tenant Composio config")
    );
  }

  return mapComposioRow(data as ComposioConfigRow);
}

export async function updateTenantComposioIntegration(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  payload: {
    enabled?: boolean;
    selected_toolkits?: string[];
  }
): Promise<ComposioConfig> {
  const existing = await fetchComposioConfig(admin, context);
  if (!existing) {
    throw new TenantComposioServiceError(400, "Composio integration not enabled");
  }

  const updatePayload: Record<string, unknown> = {};
  if (payload.enabled !== undefined) {
    updatePayload["enabled"] = payload.enabled;
  }
  if (payload.selected_toolkits !== undefined) {
    updatePayload["selected_toolkits"] = payload.selected_toolkits;
  }
  if (context.legacyInstanceId) {
    updatePayload["instance_id"] = context.legacyInstanceId;
  }

  if (Object.keys(updatePayload).length === 0) {
    return mapComposioRow(existing);
  }

  const { data, error } = await admin
    .from("composio_configs")
    .update(updatePayload)
    .eq("id", existing.id)
    .select(COMPOSIO_SELECT)
    .single();

  if (error || !data) {
    throw new TenantComposioServiceError(
      500,
      safeErrorMessage(error, "Failed to update tenant Composio config")
    );
  }

  return mapComposioRow(data as ComposioConfigRow);
}

export async function deleteTenantComposioIntegration(
  admin: SupabaseClient,
  context: TenantComposioMutationContext
): Promise<void> {
  const { error } = await admin
    .from("composio_configs")
    .delete()
    .eq("customer_id", context.customerId);

  if (error) {
    throw new TenantComposioServiceError(
      500,
      safeErrorMessage(error, "Failed to delete tenant Composio config")
    );
  }
}

export async function getTenantComposioToolkits(
  admin: SupabaseClient,
  context: TenantComposioMutationContext
): Promise<string[]> {
  const config = await fetchComposioConfig(admin, context);
  if (!config) {
    return [];
  }

  return toStringArray(config.selected_toolkits);
}

export async function updateTenantComposioToolkits(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  selectedToolkits: string[]
): Promise<ComposioConfig> {
  return updateTenantComposioIntegration(admin, context, {
    selected_toolkits: selectedToolkits,
  });
}

export async function initiateTenantComposioOAuth(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  composio: ComposioClient,
  appId: string,
  redirectUrl: string
): Promise<ComposioOAuthResult> {
  const config = await fetchComposioConfig(admin, context);
  if (!config || !config.enabled) {
    throw new TenantComposioServiceError(400, "Composio integration not enabled");
  }

  try {
    return await composio.initiateOAuthConnection(
      config.composio_user_id,
      appId,
      redirectUrl
    );
  } catch (error) {
    throw new TenantComposioServiceError(
      502,
      safeErrorMessage(error, "Failed to initiate Composio OAuth connection")
    );
  }
}

export async function syncTenantComposioConnections(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  composio: ComposioClient
): Promise<ComposioConnectedApp[]> {
  const config = await fetchComposioConfig(admin, context);
  if (!config) {
    return [];
  }

  let accounts: Awaited<ReturnType<ComposioClient["getConnectedAccounts"]>>;
  try {
    accounts = await composio.getConnectedAccounts(config.composio_user_id);
  } catch (error) {
    throw new TenantComposioServiceError(
      502,
      safeErrorMessage(error, "Failed to sync Composio connected accounts")
    );
  }

  const connectedApps: ComposioConnectedApp[] = accounts.map((account) => ({
    id: account.id,
    app_id: account.app_id,
    app_name: account.app_name,
    status: mapAccountStatus(account.status),
    account_identifier: account.account_identifier,
    connected_at: account.created_at,
  }));

  const updatePayload: Record<string, unknown> = {
    connected_apps: connectedApps,
    last_sync_at: new Date().toISOString(),
  };
  if (context.legacyInstanceId) {
    updatePayload["instance_id"] = context.legacyInstanceId;
  }

  const { error } = await admin
    .from("composio_configs")
    .update(updatePayload)
    .eq("id", config.id);

  if (error) {
    throw new TenantComposioServiceError(
      500,
      safeErrorMessage(error, "Failed to persist Composio connection sync")
    );
  }

  return connectedApps;
}

export async function disconnectTenantComposioConnection(
  admin: SupabaseClient,
  context: TenantComposioMutationContext,
  composio: ComposioClient,
  connectionId: string
): Promise<void> {
  const config = await fetchComposioConfig(admin, context);
  if (!config) {
    throw new TenantComposioServiceError(404, "Composio integration not enabled");
  }

  let accounts: Awaited<ReturnType<ComposioClient["getConnectedAccounts"]>>;
  try {
    accounts = await composio.getConnectedAccounts(config.composio_user_id);
  } catch (error) {
    throw new TenantComposioServiceError(
      502,
      safeErrorMessage(error, "Failed to verify Composio account ownership")
    );
  }

  const ownsConnection = accounts.some((account) => account.id === connectionId);
  if (!ownsConnection) {
    throw new TenantComposioServiceError(404, "Composio connection not found");
  }

  try {
    await composio.disconnectApp(connectionId);
  } catch (error) {
    throw new TenantComposioServiceError(
      502,
      safeErrorMessage(error, "Failed to disconnect Composio account")
    );
  }

  await syncTenantComposioConnections(admin, context, composio);
}
