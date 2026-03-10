import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/lib/crypto";
import type { CreateSecretInput, UpdateSecretInput } from "@/lib/validators/secrets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantSecret {
  id: string;
  tenant_id: string;
  customer_id: string;
  label: string;
  description: string | null;
  value_hint: string;
  usage_mode: "inject" | "break_glass";
  inject_scheme: "bearer" | "basic" | "header" | "query_param";
  inject_header_name: string | null;
  inject_param_name: string | null;
  allowed_agent_ids: string[] | null;
  allowed_domains: string[] | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

function maskValue(value: string): string {
  if (value.length <= 4) return "****";
  if (value.length <= 8) return `${value.slice(0, 2)}***${value.slice(-1)}`;
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

const SECRET_SELECT_COLUMNS =
  "id, tenant_id, customer_id, label, description, value_hint, usage_mode, inject_scheme, inject_header_name, inject_param_name, allowed_agent_ids, allowed_domains, last_used_at, use_count, created_at, updated_at";

export async function listTenantSecrets(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantSecret[]> {
  const { data, error } = await admin
    .from("tenant_secrets")
    .select(SECRET_SELECT_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list secrets: ${error.message}`);
  return (data ?? []) as TenantSecret[];
}

export async function createTenantSecret(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  input: CreateSecretInput
): Promise<TenantSecret> {
  const encryptedValue = encrypt(input.value);
  const valueHint = maskValue(input.value);

  const { data, error } = await admin
    .from("tenant_secrets")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      label: input.label,
      description: input.description ?? null,
      encrypted_value: encryptedValue,
      value_hint: valueHint,
      usage_mode: input.usage_mode,
      inject_scheme: input.inject_scheme,
      inject_header_name: input.inject_header_name ?? null,
      inject_param_name: input.inject_param_name ?? null,
      allowed_agent_ids: input.allowed_agent_ids ?? null,
      allowed_domains: input.allowed_domains ?? null,
      created_by: customerId,
    })
    .select(SECRET_SELECT_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to create secret: ${error.message}`);

  // Auto-provision reveal_secret tool record if this is the first secret for the tenant
  void ensureRevealSecretTool(admin, tenantId);

  return data as TenantSecret;
}

export async function updateTenantSecret(
  admin: SupabaseClient,
  tenantId: string,
  secretId: string,
  input: UpdateSecretInput
): Promise<TenantSecret> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.description !== undefined) updates.description = input.description;
  if (input.usage_mode !== undefined) updates.usage_mode = input.usage_mode;
  if (input.inject_scheme !== undefined) updates.inject_scheme = input.inject_scheme;
  if (input.inject_header_name !== undefined) updates.inject_header_name = input.inject_header_name;
  if (input.inject_param_name !== undefined) updates.inject_param_name = input.inject_param_name;
  if (input.allowed_agent_ids !== undefined) updates.allowed_agent_ids = input.allowed_agent_ids;
  if (input.allowed_domains !== undefined) updates.allowed_domains = input.allowed_domains;

  if (input.value !== undefined) {
    updates.encrypted_value = encrypt(input.value);
    updates.value_hint = maskValue(input.value);
  }

  const { data, error } = await admin
    .from("tenant_secrets")
    .update(updates)
    .eq("id", secretId)
    .eq("tenant_id", tenantId)
    .select(SECRET_SELECT_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to update secret: ${error.message}`);
  return data as TenantSecret;
}

export async function deleteTenantSecret(
  admin: SupabaseClient,
  tenantId: string,
  secretId: string
): Promise<void> {
  const { error } = await admin
    .from("tenant_secrets")
    .delete()
    .eq("id", secretId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Failed to delete secret: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Internal: decrypt a secret value (used only by handle system, never exposed
// to the LLM context directly)
// ---------------------------------------------------------------------------

export async function decryptSecretValue(
  admin: SupabaseClient,
  tenantId: string,
  secretId: string
): Promise<{ value: string; secret: TenantSecret }> {
  const { data, error } = await admin
    .from("tenant_secrets")
    .select(`${SECRET_SELECT_COLUMNS}, encrypted_value`)
    .eq("id", secretId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) throw new Error("Secret not found");

  const value = decrypt(data.encrypted_value);

  // Bump usage stats (fire-and-forget)
  admin
    .from("tenant_secrets")
    .update({ last_used_at: new Date().toISOString(), use_count: (data.use_count ?? 0) + 1 })
    .eq("id", secretId)
    .then(() => {}).catch((err: unknown) => console.error("Secret usage stats update failed", err));

  const { encrypted_value: _, ...rest } = data;
  return { value, secret: rest as TenantSecret };
}

// ---------------------------------------------------------------------------
// Auto-provision reveal_secret tool + policy on first secret creation
// ---------------------------------------------------------------------------

async function ensureRevealSecretTool(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  try {
    const { data: existing } = await admin
      .from("tenant_tools")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("tool_key", "reveal_secret")
      .maybeSingle();

    if (existing) return;

    await admin.from("tenant_tools").insert({
      tenant_id: tenantId,
      tool_key: "reveal_secret",
      status: "disabled",
      risk_level: "critical",
    });

    await admin.from("tenant_tool_policies").insert({
      tenant_id: tenantId,
      tool_key: "reveal_secret",
      approval_mode: "always",
      allow_roles: ["owner"],
      max_calls_per_hour: 5,
      timeout_ms: 30000,
    });
  } catch (err) {
    console.error("Failed to auto-provision reveal_secret tool", err);
  }
}
