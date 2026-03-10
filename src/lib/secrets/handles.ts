import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { decryptSecretValue } from "./vault";

// ---------------------------------------------------------------------------
// Credential Handle System
//
// Secrets are never exposed to the LLM. Instead:
//   1. Agent calls `use_credential({ label, purpose })` → gets an opaque handle ID
//   2. Agent passes handle to `http_request({ ..., credential_handle })`
//   3. Server-side injection reads the handle, decrypts, injects headers, redacts from traces
//
// Handles are ephemeral (per-run), scoped to tenant+agent, and expire after use.
// ---------------------------------------------------------------------------

export interface CredentialHandle {
  handleId: string;
  secretId: string;
  tenantId: string;
  agentId: string | null;
  purpose: "http" | "break_glass";
  createdAt: number;
  consumed: boolean;
}

// In-memory handle store (per-process, ephemeral — handles live only for the
// duration of a single AI worker execution, max ~30 seconds)
const handleStore = new Map<string, CredentialHandle>();

// Handles expire after 60 seconds
const HANDLE_TTL_MS = 60_000;

function pruneExpiredHandles(): void {
  const now = Date.now();
  for (const [id, handle] of handleStore) {
    if (now - handle.createdAt > HANDLE_TTL_MS) {
      handleStore.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Create handle
// ---------------------------------------------------------------------------

export interface CreateHandleInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  label: string;
  agentId: string | null;
  purpose: "http" | "break_glass";
  runId?: string | null;
}

export interface CreateHandleResult {
  handleId: string;
  label: string;
  inject_scheme: string;
  allowed_domains: string[] | null;
}

export async function createCredentialHandle(
  input: CreateHandleInput
): Promise<CreateHandleResult> {
  pruneExpiredHandles();

  // Look up the secret by label
  const { data: secret, error } = await input.admin
    .from("tenant_secrets")
    .select("id, label, inject_scheme, allowed_agent_ids, allowed_domains, usage_mode")
    .eq("tenant_id", input.tenantId)
    .eq("label", input.label)
    .single();

  if (error || !secret) {
    throw new Error(`Secret "${input.label}" not found`);
  }

  // Check agent scoping
  if (secret.allowed_agent_ids && secret.allowed_agent_ids.length > 0) {
    if (!input.agentId || !secret.allowed_agent_ids.includes(input.agentId)) {
      throw new Error(`Agent not authorized to use secret "${input.label}"`);
    }
  }

  // Check usage_mode vs purpose
  if (input.purpose === "http" && secret.usage_mode !== "inject") {
    throw new Error(
      `Secret "${input.label}" is not configured for credential injection. ` +
      `Change its usage mode to "Inject" in the Secrets Vault settings.`
    );
  }

  if (input.purpose === "break_glass" && secret.usage_mode !== "break_glass") {
    throw new Error(
      `Secret "${input.label}" is not configured for break-glass access. ` +
      `It can only be used via credential injection (usage_mode: inject).`
    );
  }

  const handleId = `cred_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const handle: CredentialHandle = {
    handleId,
    secretId: secret.id,
    tenantId: input.tenantId,
    agentId: input.agentId,
    purpose: input.purpose,
    createdAt: Date.now(),
    consumed: false,
  };

  handleStore.set(handleId, handle);

  // Audit: handle created
  void Promise.resolve(
    input.admin
      .from("tenant_secret_audit_log")
      .insert({
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        secret_id: secret.id,
        action: "handle_created",
        agent_id: input.agentId,
        run_id: input.runId ?? null,
      })
  ).catch((err: unknown) => console.error("Audit log insert failed", err));

  return {
    handleId,
    label: secret.label,
    inject_scheme: secret.inject_scheme,
    allowed_domains: secret.allowed_domains,
  };
}

// ---------------------------------------------------------------------------
// Consume handle (used by http_request tool to inject credentials)
// ---------------------------------------------------------------------------

export interface ConsumedCredential {
  value: string;
  scheme: "bearer" | "basic" | "header" | "query_param";
  headerName: string | null;
  paramName: string | null;
  allowedDomains: string[] | null;
  secretId: string;
}

export async function consumeCredentialHandle(
  admin: SupabaseClient,
  handleId: string,
  tenantId: string
): Promise<ConsumedCredential> {
  const handle = handleStore.get(handleId);

  if (!handle) {
    throw new Error("Invalid or expired credential handle");
  }

  if (handle.tenantId !== tenantId) {
    throw new Error("Credential handle tenant mismatch");
  }

  if (handle.consumed) {
    throw new Error("Credential handle already consumed");
  }

  if (Date.now() - handle.createdAt > HANDLE_TTL_MS) {
    handleStore.delete(handleId);
    throw new Error("Credential handle expired");
  }

  // Mark consumed
  handle.consumed = true;
  handleStore.delete(handleId);

  // Decrypt the actual secret value (server-side only)
  const { value, secret } = await decryptSecretValue(admin, tenantId, handle.secretId);

  return {
    value,
    scheme: secret.inject_scheme as ConsumedCredential["scheme"],
    headerName: secret.inject_header_name,
    paramName: secret.inject_param_name,
    allowedDomains: secret.allowed_domains,
    secretId: secret.id,
  };
}

// ---------------------------------------------------------------------------
// Break-glass: reveal raw secret value (approval-gated, fully audited)
// ---------------------------------------------------------------------------

export interface RevealSecretInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  secretId: string;
  agentId: string | null;
  runId: string | null;
  reason: string;
}

export interface RevealSecretResult {
  value: string;
  label: string;
}

export async function revealSecretValue(
  input: RevealSecretInput
): Promise<RevealSecretResult> {
  // Look up the secret
  const { data: secret, error } = await input.admin
    .from("tenant_secrets")
    .select("id, label, allowed_agent_ids, usage_mode")
    .eq("id", input.secretId)
    .eq("tenant_id", input.tenantId)
    .single();

  if (error || !secret) {
    throw new Error("Secret not found");
  }

  // Check agent scoping
  if (secret.allowed_agent_ids && secret.allowed_agent_ids.length > 0) {
    if (!input.agentId || !secret.allowed_agent_ids.includes(input.agentId)) {
      throw new Error(`Agent not authorized to reveal secret "${secret.label}"`);
    }
  }

  // Verify usage_mode allows break-glass
  if (secret.usage_mode !== "break_glass") {
    throw new Error(
      `Secret "${secret.label}" is not configured for break-glass access. ` +
      `Change its usage mode to "Break glass" in the Secrets Vault settings.`
    );
  }

  // Decrypt
  const { value } = await decryptSecretValue(input.admin, input.tenantId, input.secretId);

  // Audit log: reveal_approved
  void Promise.resolve(
    input.admin
      .from("tenant_secret_audit_log")
      .insert({
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        secret_id: input.secretId,
        action: "reveal_approved",
        agent_id: input.agentId,
        run_id: input.runId,
        metadata: { reason: input.reason },
      })
  ).catch((err: unknown) => console.error("Audit log insert failed", err));

  return { value, label: secret.label };
}

// ---------------------------------------------------------------------------
// For testing / diagnostics
// ---------------------------------------------------------------------------

export function getActiveHandleCount(): number {
  pruneExpiredHandles();
  return handleStore.size;
}
