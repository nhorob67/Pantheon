import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantSession, TenantSessionKind } from "@/types/tenant-runtime";

interface ResolveSessionInput {
  tenantId: string;
  customerId: string;
  channelId: string;
  agentId: string | null;
  sessionKind: TenantSessionKind;
}

export async function resolveSession(
  admin: SupabaseClient,
  input: ResolveSessionInput
): Promise<TenantSession> {
  // Try to find existing session for this channel
  const { data: existing, error: findError } = await admin
    .from("tenant_sessions")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("external_id", input.channelId)
    .eq("session_kind", input.sessionKind)
    .eq("status", "active")
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to resolve session: ${findError.message}`);
  }

  if (existing) {
    // Update agent_id if it changed (channel rebinding)
    if (input.agentId && existing.agent_id !== input.agentId) {
      await admin
        .from("tenant_sessions")
        .update({ agent_id: input.agentId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return existing as TenantSession;
  }

  // Create new session
  const { data: created, error: createError } = await admin
    .from("tenant_sessions")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      agent_id: input.agentId,
      session_kind: input.sessionKind,
      external_id: input.channelId,
      status: "active",
      metadata: {},
    })
    .select("*")
    .single();

  if (createError) {
    // Handle race condition: another request created it first
    if ((createError as { code?: string }).code === "23505") {
      const { data: raced } = await admin
        .from("tenant_sessions")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("external_id", input.channelId)
        .eq("session_kind", input.sessionKind)
        .eq("status", "active")
        .maybeSingle();
      if (raced) return raced as TenantSession;
    }
    throw new Error(`Failed to create session: ${createError.message}`);
  }

  return created as TenantSession;
}
