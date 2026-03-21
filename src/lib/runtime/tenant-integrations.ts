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

const AUTH_METHOD_TO_INJECT_SCHEME: Record<IntegrationAuthMethod, "bearer" | "basic" | "header" | "query_param" | "multi_header"> = {
  bearer: "bearer",
  basic: "basic",
  api_key: "header",
  header: "header",
  multi_header: "multi_header",
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
      input.authMethod === "multi_header"
        ? "multi_header:{...}"
        : input.apiKey.length <= 8
          ? `${input.apiKey.slice(0, 2)}***`
          : `${input.apiKey.slice(0, 4)}***${input.apiKey.slice(-3)}`;

    const { error: updateError } = await input.admin
      .from("tenant_secrets")
      .update({
        encrypted_value: encryptedValue,
        value_hint: valueHint,
        inject_scheme: AUTH_METHOD_TO_INJECT_SCHEME[input.authMethod],
        inject_header_name: input.authHeader ?? (input.authMethod === "api_key" ? "Api-Key" : null),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update integration credential: ${updateError.message}`);
    }

    // Eagerly link this secret to any integration whose slug matches or contains
    // the service_slug (e.g., credential "discourse" → integration "discourse-updated").
    await backfillSecretToIntegrations(input.admin, input.tenantId, input.serviceSlug, existing.id);

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

  // Eagerly link this secret to any integration whose slug matches or contains
  // the service_slug (e.g., credential "discourse" → integration "discourse-updated").
  await backfillSecretToIntegrations(input.admin, input.tenantId, input.serviceSlug, secret.id);

  return {
    secret_id: secret.id,
    label: secret.label,
    value_hint: secret.value_hint,
  };
}

// ---------------------------------------------------------------------------
// Backfill _secret_id into integrations whose slug matches the service slug
// ---------------------------------------------------------------------------

async function backfillSecretToIntegrations(
  admin: SupabaseClient,
  tenantId: string,
  serviceSlug: string,
  secretId: string
): Promise<void> {
  // Find integrations whose slug exactly matches or starts with the service slug
  // (e.g., service_slug "discourse" matches integration slugs "discourse", "discourse-updated")
  const { data: integrations } = await admin
    .from("tenant_integrations")
    .select("id, slug, config")
    .eq("tenant_id", tenantId);

  if (!integrations) return;

  for (const integration of integrations) {
    const slug = (integration as { slug: string }).slug;
    if (slug !== serviceSlug && !slug.startsWith(`${serviceSlug}-`)) continue;

    const config = (integration as { config: Record<string, unknown> }).config ?? {};
    if (config._secret_id === secretId) continue; // Already linked

    void admin
      .from("tenant_integrations")
      .update({
        config: { ...config, _secret_id: secretId },
        updated_at: new Date().toISOString(),
      })
      .eq("id", (integration as { id: string }).id)
      .then(() => {});
  }
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
  const { data: existingIntegration, error: existingError } = await input.admin
    .from("tenant_integrations")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("slug", input.slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load integration: ${existingError.message}`);
  }

  if (!existingIntegration) {
    const { count, error: countError } = await input.admin
      .from("tenant_integrations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", input.tenantId);

    if (countError) throw new Error(`Failed to count integrations: ${countError.message}`);
    if ((count ?? 0) >= MAX_INTEGRATIONS_PER_TENANT) {
      throw new Error(`Maximum of ${MAX_INTEGRATIONS_PER_TENANT} integrations per workspace`);
    }
  }

  // If no explicit connector_account_id, try to find the matching secret
  const connectorAccountId = input.connectorAccountId ?? null;
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

      // Reconcile the secret's inject_scheme to match the integration's auth_method.
      // This fixes cases where the credential was stored before multi_header support
      // was added, leaving inject_scheme as "header" while auth_method is "multi_header".
      const expectedScheme = AUTH_METHOD_TO_INJECT_SCHEME[input.authMethod];
      if (expectedScheme) {
        await input.admin
          .from("tenant_secrets")
          .update({ inject_scheme: expectedScheme, updated_at: new Date().toISOString() })
          .eq("id", secret.id);
      }
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

export function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

function isDomainAllowed(hostname: string, allowedDomains: string[] | null): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  const lower = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase();
    return lower === normalized || lower.endsWith(`.${normalized}`);
  });
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
  rate_limit_warning?: string;
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

  // Keep paths pinned to the configured integration origin.
  if (input.path.startsWith("//")) {
    return { error: "Integration paths must be relative to the configured base URL." };
  }

  // Build the full URL
  const fullUrl = new URL(input.path, integration.base_url);
  const integrationOrigin = new URL(integration.base_url).origin;
  if (fullUrl.origin !== integrationOrigin) {
    return { error: "Integration paths must stay on the configured integration host." };
  }
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

  // Check for active rate limit
  const rateLimit = (integration.config as Record<string, unknown>)?._rate_limit as
    | { retry_after: string; recorded_at: string }
    | undefined;
  if (rateLimit?.retry_after) {
    const retryAt = new Date(rateLimit.retry_after);
    if (retryAt > new Date()) {
      const waitSec = Math.ceil((retryAt.getTime() - Date.now()) / 1000);
      return {
        error: `Rate limited by ${input.integrationSlug}. Try again in ~${waitSec}s.`,
      };
    }
  }

  // Resolve credential
  let secretId = (integration.config as Record<string, unknown>)?._secret_id as string | undefined;
  let secretValue: string | null = null;
  const requestHeaders: Record<string, string> = {
    "User-Agent": "Pantheon/1.0",
    ...(input.headers ?? {}),
  };

  // Fallback: if _secret_id is missing from config, try to find the secret by
  // label and backfill the config so future calls don't need this lookup.
  if (!secretId) {
    // Try exact match first: integration-discourse-updated
    const exactLabel = `integration-${integration.slug}`;
    const { data: exactSecret } = await input.admin
      .from("tenant_secrets")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("label", exactLabel)
      .maybeSingle();

    let foundSecret = exactSecret;

    // If no exact match, try base slug: e.g., for "discourse-updated" try "integration-discourse"
    if (!foundSecret && integration.slug.includes("-")) {
      const baseSlug = integration.slug.replace(/-[^-]+$/, "");
      const baseLabel = `integration-${baseSlug}`;
      const { data: baseSecret } = await input.admin
        .from("tenant_secrets")
        .select("id")
        .eq("tenant_id", input.tenantId)
        .eq("label", baseLabel)
        .maybeSingle();
      foundSecret = baseSecret;
    }

    // Last resort: find any integration-* secret with a label that the slug starts with
    if (!foundSecret) {
      const { data: allSecrets } = await input.admin
        .from("tenant_secrets")
        .select("id, label")
        .eq("tenant_id", input.tenantId)
        .like("label", "integration-%");

      if (allSecrets) {
        for (const s of allSecrets) {
          const secretSlug = (s as { label: string }).label.replace(/^integration-/, "");
          if (integration.slug.startsWith(secretSlug)) {
            foundSecret = s as { id: string };
            break;
          }
        }
      }
    }

    if (foundSecret) {
      secretId = (foundSecret as { id: string }).id;
      // Backfill _secret_id into integration config for future calls
      void input.admin
        .from("tenant_integrations")
        .update({
          config: {
            ...(integration.config as Record<string, unknown>),
            _secret_id: secretId,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", input.tenantId)
        .eq("slug", input.integrationSlug)
        .then(() => {});
    }
  }

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
        if (!isDomainAllowed(fullUrl.hostname, credential.allowedDomains)) {
          return {
            error: `Integration credential is not allowed for domain "${fullUrl.hostname}".`,
          };
        }
        secretValue = credential.value;
        const effectiveScheme = AUTH_METHOD_TO_INJECT_SCHEME[integration.auth_method as IntegrationAuthMethod] ?? credential.scheme;
        switch (effectiveScheme) {
          case "bearer":
            requestHeaders["Authorization"] = `Bearer ${credential.value}`;
            break;
          case "basic":
            requestHeaders["Authorization"] = `Basic ${Buffer.from(credential.value).toString("base64")}`;
            break;
          case "header":
            requestHeaders[credential.headerName || integration.auth_header || "Api-Key"] = credential.value;
            break;
          case "multi_header": {
            // Value is a JSON object of { headerName: headerValue } pairs.
            // Example for Discourse: { "Api-Key": "abc123", "Api-Username": "system" }
            let headers: Record<string, string>;
            try {
              headers = JSON.parse(credential.value);
            } catch {
              return { error: `Invalid multi_header credential for "${input.integrationSlug}": value must be a JSON object of header name/value pairs.` };
            }
            if (typeof headers !== "object" || headers === null || Array.isArray(headers)) {
              return { error: `Invalid multi_header credential for "${input.integrationSlug}": expected a JSON object.` };
            }
            for (const [name, val] of Object.entries(headers)) {
              if (typeof val === "string") {
                requestHeaders[name] = val;
              }
            }
            break;
          }
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
  } else {
    // No credential found — warn that the request will be unauthenticated
    return {
      error:
        `No credential found for integration "${input.integrationSlug}". ` +
        `Store a credential first with integration_store_credential using service_slug "${integration.slug}".`,
    };
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

    // Parse rate limit headers
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const retryAfter = response.headers.get("retry-after");

    // If we got a 429, record it and include guidance
    if (response.status === 429) {
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      const retryAt = new Date(Date.now() + retrySeconds * 1000).toISOString();

      // Store rate limit state on the integration
      void input.admin
        .from("tenant_integrations")
        .update({
          last_error: `Rate limited until ${retryAt}`,
          config: {
            ...(integration.config as Record<string, unknown>),
            _rate_limit: { retry_after: retryAt, recorded_at: new Date().toISOString() },
          },
        })
        .eq("tenant_id", input.tenantId)
        .eq("slug", input.integrationSlug)
        .then(() => {});
    }

    // Truncate
    if (responseBody.length > MAX_RESPONSE_BODY_LENGTH) {
      responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH) + "\n[...truncated]";
    }

    // Redact secret values from response
    if (secretValue) {
      responseBody = redactValue(responseBody, secretValue);
      // For multi_header, also redact each individual header value
      try {
        const parsed = JSON.parse(secretValue);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          for (const val of Object.values(parsed)) {
            if (typeof val === "string" && val.length >= 4) {
              responseBody = redactValue(responseBody, val);
            }
          }
        }
      } catch {
        // Not JSON — single-value secret, already redacted above
      }
      responseBody = redactCommonPatterns(responseBody);
    }

    // Update last_used_at
    void input.admin
      .from("tenant_integrations")
      .update({ last_used_at: new Date().toISOString(), last_error: null })
      .eq("tenant_id", input.tenantId)
      .eq("slug", input.integrationSlug)
      .then(() => {});

    // Warn when rate limit headroom is very low
    const rateLimitRemainingNum = rateLimitRemaining !== null ? parseInt(rateLimitRemaining, 10) : null;
    const rateLimitWarning =
      rateLimitRemainingNum !== null && !isNaN(rateLimitRemainingNum) && rateLimitRemainingNum <= 5
        ? `Rate limit headroom is low: ${rateLimitRemainingNum} request(s) remaining.`
        : undefined;

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
      ...(rateLimitWarning !== undefined ? { rate_limit_warning: rateLimitWarning } : {}),
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
