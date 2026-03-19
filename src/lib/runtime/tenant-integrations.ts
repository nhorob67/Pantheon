import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TenantIntegration,
  IntegrationSummary,
  IntegrationStatus,
  IntegrationAuthMethod,
  DiscoveredEndpoint,
} from "@/types/integration";
import { createTenantSecret } from "@/lib/secrets/vault";
import { createCredentialHandle, consumeCredentialHandle } from "@/lib/secrets/handles";
import { redactValue, redactCommonPatterns } from "@/lib/secrets/redaction";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INTEGRATIONS_PER_TENANT = 25;
const MAX_RESPONSE_BODY_LENGTH = 8_000;
const REQUEST_TIMEOUT_MS = 15_000;

const AUTH_METHOD_TO_INJECT_SCHEME: Record<IntegrationAuthMethod, "bearer" | "basic" | "header" | "query_param"> = {
  bearer: "bearer",
  basic: "basic",
  api_key: "header",
  header: "header",
};

// ---------------------------------------------------------------------------
// Store credential for an integration
// ---------------------------------------------------------------------------

export interface StoreIntegrationCredentialInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  serviceSlug: string;
  apiKey: string;
  authMethod: IntegrationAuthMethod;
  authHeader?: string;
  metadata?: Record<string, string>;
}

export interface StoreIntegrationCredentialResult {
  secret_id: string;
  label: string;
  value_hint: string;
}

export async function storeIntegrationCredential(
  input: StoreIntegrationCredentialInput
): Promise<StoreIntegrationCredentialResult> {
  const label = `integration-${input.serviceSlug}`;

  // Check if a secret with this label already exists for the tenant
  const { data: existing } = await input.admin
    .from("tenant_secrets")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("label", label)
    .maybeSingle();

  if (existing) {
    // Update the existing secret's value
    const { encrypt } = await import("@/lib/crypto");
    const encryptedValue = encrypt(input.apiKey);
    const valueHint =
      input.apiKey.length <= 8
        ? `${input.apiKey.slice(0, 2)}***`
        : `${input.apiKey.slice(0, 4)}***${input.apiKey.slice(-3)}`;

    await input.admin
      .from("tenant_secrets")
      .update({
        encrypted_value: encryptedValue,
        value_hint: valueHint,
        inject_scheme: AUTH_METHOD_TO_INJECT_SCHEME[input.authMethod],
        inject_header_name: input.authHeader ?? (input.authMethod === "api_key" ? "Api-Key" : null),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return {
      secret_id: existing.id,
      label,
      value_hint: valueHint,
    };
  }

  // Determine the inject_header_name based on auth_method
  const injectHeaderName =
    input.authMethod === "header" || input.authMethod === "api_key"
      ? (input.authHeader ?? "Api-Key")
      : undefined;

  const secret = await createTenantSecret(input.admin, input.tenantId, input.customerId, {
    label,
    description: `API credential for ${input.serviceSlug} integration (stored by agent)`,
    value: input.apiKey,
    usage_mode: "inject",
    inject_scheme: AUTH_METHOD_TO_INJECT_SCHEME[input.authMethod],
    inject_header_name: injectHeaderName,
    allowed_domains: input.metadata?.base_url ? [new URL(input.metadata.base_url).hostname] : undefined,
  });

  return {
    secret_id: secret.id,
    label: secret.label,
    value_hint: secret.value_hint,
  };
}

// ---------------------------------------------------------------------------
// Register integration
// ---------------------------------------------------------------------------

export interface RegisterIntegrationInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  slug: string;
  displayName: string;
  serviceType: string;
  baseUrl?: string;
  connectorAccountId?: string;
  authMethod: IntegrationAuthMethod;
  authHeader?: string;
  apiDocsUrl?: string;
  discoveredEndpoints?: DiscoveredEndpoint[];
  capabilitiesSummary?: string;
  config?: Record<string, unknown>;
}

export async function registerIntegration(
  input: RegisterIntegrationInput
): Promise<TenantIntegration> {
  // Check limits
  const { count, error: countError } = await input.admin
    .from("tenant_integrations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", input.tenantId);

  if (countError) throw new Error(`Failed to count integrations: ${countError.message}`);
  if ((count ?? 0) >= MAX_INTEGRATIONS_PER_TENANT) {
    throw new Error(`Maximum of ${MAX_INTEGRATIONS_PER_TENANT} integrations per workspace`);
  }

  // If no explicit connector_account_id, try to find the matching secret
  let connectorAccountId = input.connectorAccountId ?? null;
  if (!connectorAccountId) {
    const secretLabel = `integration-${input.slug}`;
    const { data: secret } = await input.admin
      .from("tenant_secrets")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("label", secretLabel)
      .maybeSingle();

    // Store the secret ID in config so we can look it up later for API calls
    if (secret) {
      input.config = { ...input.config, _secret_id: secret.id };
    }
  }

  const { data, error } = await input.admin
    .from("tenant_integrations")
    .upsert(
      {
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        slug: input.slug,
        display_name: input.displayName,
        service_type: input.serviceType,
        base_url: input.baseUrl ?? null,
        connector_account_id: connectorAccountId,
        auth_method: input.authMethod,
        auth_header: input.authHeader ?? null,
        api_docs_url: input.apiDocsUrl ?? null,
        discovered_endpoints: input.discoveredEndpoints ?? [],
        capabilities_summary: input.capabilitiesSummary ?? null,
        config: input.config ?? {},
        status: "active",
        created_by_agent_id: input.agentId,
      },
      { onConflict: "tenant_id,slug" }
    )
    .select("*")
    .single();

  if (error) throw new Error(`Failed to register integration: ${error.message}`);
  return data as TenantIntegration;
}

// ---------------------------------------------------------------------------
// List integrations
// ---------------------------------------------------------------------------

export async function listIntegrations(
  admin: SupabaseClient,
  tenantId: string,
  statusFilter?: IntegrationStatus
): Promise<IntegrationSummary[]> {
  let query = admin
    .from("tenant_integrations")
    .select("id, slug, display_name, service_type, base_url, status, capabilities_summary, last_used_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list integrations: ${error.message}`);

  const integrations = (data ?? []) as Array<{
    id: string;
    slug: string;
    display_name: string;
    service_type: string;
    base_url: string | null;
    status: IntegrationStatus;
    capabilities_summary: string | null;
    last_used_at: string | null;
  }>;

  // Get schedule counts in batch
  if (integrations.length === 0) return [];

  const integrationIds = integrations.map((i) => i.id);
  const { data: scheduleCounts } = await admin
    .from("tenant_integration_schedules")
    .select("integration_id")
    .in("integration_id", integrationIds);

  const countMap = new Map<string, number>();
  for (const row of scheduleCounts ?? []) {
    const id = (row as { integration_id: string }).integration_id;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  return integrations.map((i) => ({
    ...i,
    schedule_count: countMap.get(i.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Get single integration
// ---------------------------------------------------------------------------

export async function getIntegration(
  admin: SupabaseClient,
  tenantId: string,
  integrationId: string
): Promise<TenantIntegration | null> {
  const { data, error } = await admin
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", integrationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get integration: ${error.message}`);
  return data as TenantIntegration | null;
}

// ---------------------------------------------------------------------------
// Get integration by slug
// ---------------------------------------------------------------------------

export async function getIntegrationBySlug(
  admin: SupabaseClient,
  tenantId: string,
  slug: string
): Promise<TenantIntegration | null> {
  const { data, error } = await admin
    .from("tenant_integrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to get integration: ${error.message}`);
  return data as TenantIntegration | null;
}

// ---------------------------------------------------------------------------
// Update integration
// ---------------------------------------------------------------------------

export async function updateIntegration(
  admin: SupabaseClient,
  tenantId: string,
  integrationId: string,
  updates: {
    display_name?: string;
    status?: "active" | "inactive";
    base_url?: string;
    config?: Record<string, unknown>;
  }
): Promise<TenantIntegration> {
  const { data, error } = await admin
    .from("tenant_integrations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", integrationId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update integration: ${error.message}`);
  return data as TenantIntegration;
}

// ---------------------------------------------------------------------------
// Delete integration
// ---------------------------------------------------------------------------

export async function deleteIntegration(
  admin: SupabaseClient,
  tenantId: string,
  integrationId: string
): Promise<void> {
  const { error } = await admin
    .from("tenant_integrations")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", integrationId);

  if (error) throw new Error(`Failed to delete integration: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Execute API call via integration
// ---------------------------------------------------------------------------

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "169.254.169.254",
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

export interface IntegrationApiCallInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runId: string | null;
  integrationSlug: string;
  method: string;
  path: string;
  queryParams?: Record<string, string>;
  body?: string;
  headers?: Record<string, string>;
}

export interface IntegrationApiCallResult {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  integration: string;
}

export async function executeIntegrationApiCall(
  input: IntegrationApiCallInput
): Promise<IntegrationApiCallResult | { error: string }> {
  // Look up integration
  const integration = await getIntegrationBySlug(input.admin, input.tenantId, input.integrationSlug);
  if (!integration) {
    return { error: `Integration "${input.integrationSlug}" not found. Use integration_list to see available integrations.` };
  }

  if (integration.status !== "active") {
    return { error: `Integration "${input.integrationSlug}" is ${integration.status}. Activate it first.` };
  }

  if (!integration.base_url) {
    return { error: `Integration "${input.integrationSlug}" has no base URL configured.` };
  }

  // Build the full URL
  const fullUrl = new URL(input.path, integration.base_url);
  if (input.queryParams) {
    for (const [key, value] of Object.entries(input.queryParams)) {
      fullUrl.searchParams.set(key, value);
    }
  }

  // SSRF protection
  if (isBlockedHost(fullUrl.hostname)) {
    return { error: "Requests to internal/private networks are not allowed." };
  }
  if (fullUrl.protocol !== "https:") {
    return { error: "Only HTTPS URLs are allowed." };
  }

  // Resolve credential
  const secretId = (integration.config as Record<string, unknown>)?._secret_id as string | undefined;
  let secretValue: string | null = null;
  const requestHeaders: Record<string, string> = {
    "User-Agent": "Pantheon/1.0",
    ...(input.headers ?? {}),
  };

  if (secretId) {
    try {
      // Create a credential handle and immediately consume it
      const secretLabel = `integration-${integration.slug}`;
      const handle = await createCredentialHandle({
        admin: input.admin,
        tenantId: input.tenantId,
        customerId: input.customerId,
        label: secretLabel,
        agentId: input.agentId,
        purpose: "http",
        runId: input.runId,
      });

      const credential = await consumeCredentialHandle(input.admin, handle.handleId, input.tenantId);
      if (credential) {
        secretValue = credential.value;
        switch (credential.scheme) {
          case "bearer":
            requestHeaders["Authorization"] = `Bearer ${credential.value}`;
            break;
          case "basic":
            requestHeaders["Authorization"] = `Basic ${Buffer.from(credential.value).toString("base64")}`;
            break;
          case "header":
            requestHeaders[credential.headerName || integration.auth_header || "Api-Key"] = credential.value;
            break;
          case "query_param": {
            const paramName = credential.paramName || "api_key";
            fullUrl.searchParams.set(paramName, credential.value);
            break;
          }
        }
      }
    } catch (err) {
      return {
        error: `Failed to resolve credentials for "${input.integrationSlug}": ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  }

  // Execute the request
  try {
    const response = await fetch(fullUrl.toString(), {
      method: input.method,
      headers: requestHeaders,
      body: input.method !== "GET" && input.method !== "DELETE" ? input.body : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let responseBody = await response.text();

    // Truncate
    if (responseBody.length > MAX_RESPONSE_BODY_LENGTH) {
      responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH) + "\n[...truncated]";
    }

    // Redact secret values from response
    if (secretValue) {
      responseBody = redactValue(responseBody, secretValue);
      responseBody = redactCommonPatterns(responseBody);
    }

    // Update last_used_at
    void input.admin
      .from("tenant_integrations")
      .update({ last_used_at: new Date().toISOString(), last_error: null })
      .eq("tenant_id", input.tenantId)
      .eq("slug", input.integrationSlug)
      .then(() => {});

    return {
      status: response.status,
      status_text: response.statusText,
      headers: Object.fromEntries(
        [...response.headers.entries()].filter(([key]) => {
          const lower = key.toLowerCase();
          return ["content-type", "x-request-id", "x-ratelimit-remaining", "retry-after"].includes(lower);
        })
      ),
      body: responseBody,
      integration: input.integrationSlug,
    };
  } catch (err) {
    // Record the error on the integration
    const errorMessage = err instanceof Error
      ? (err.name === "AbortError" || err.name === "TimeoutError"
        ? "Request timed out (15 second limit)"
        : err.message)
      : "HTTP request failed";

    void input.admin
      .from("tenant_integrations")
      .update({ last_error: errorMessage })
      .eq("tenant_id", input.tenantId)
      .eq("slug", input.integrationSlug)
      .then(() => {});

    return { error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// Link integration to a schedule
// ---------------------------------------------------------------------------

export async function linkIntegrationSchedule(
  admin: SupabaseClient,
  integrationId: string,
  scheduleId: string,
  purpose?: string
): Promise<void> {
  const { error } = await admin
    .from("tenant_integration_schedules")
    .upsert(
      {
        integration_id: integrationId,
        schedule_id: scheduleId,
        purpose: purpose ?? null,
      },
      { onConflict: "integration_id,schedule_id" }
    );

  if (error) throw new Error(`Failed to link integration schedule: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Get integrations for system prompt context
// ---------------------------------------------------------------------------

export async function getIntegrationsForPrompt(
  admin: SupabaseClient,
  tenantId: string
): Promise<Array<{
  slug: string;
  display_name: string;
  service_type: string;
  base_url: string | null;
  capabilities_summary: string | null;
}>> {
  const { data, error } = await admin
    .from("tenant_integrations")
    .select("slug, display_name, service_type, base_url, capabilities_summary")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[tenant-integrations] Failed to load integrations for prompt:", error.message);
    return [];
  }

  return (data ?? []) as Array<{
    slug: string;
    display_name: string;
    service_type: string;
    base_url: string | null;
    capabilities_summary: string | null;
  }>;
}
