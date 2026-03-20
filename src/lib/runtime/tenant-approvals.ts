import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole } from "@/types/tenant-runtime";
export interface EnqueueTenantApprovalInput {
  tenantId: string;
  customerId: string;
  approvalType: "tool" | "export" | "runtime" | "policy";
  requiredRole: TenantRole;
  toolId?: string | null;
  requestPayload: Record<string, unknown>;
  requestHashPayload: Record<string, unknown>;
  expiresInMs?: number;
}

export function buildTenantApprovalRequestHash(
  payload: Record<string, unknown>
): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export async function enqueueTenantApproval(
  admin: SupabaseClient,
  input: EnqueueTenantApprovalInput
): Promise<{ approvalId: string; deduplicated: boolean }> {
  const requestHash = buildTenantApprovalRequestHash(input.requestHashPayload);

  const expiresAt = new Date(
    Date.now() + (input.expiresInMs ?? 30 * 60 * 1000)
  ).toISOString();

  const { data, error } = await admin
    .from("tenant_approvals")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      approval_type: input.approvalType,
      status: "pending",
      required_role: input.requiredRole,
      tool_id: input.toolId ?? null,
      request_hash: requestHash,
      request_payload: input.requestPayload,
      decision_payload: {},
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing, error: existingError } = await admin
      .from("tenant_approvals")
      .select("id, status, expires_at")
      .eq("tenant_id", input.tenantId)
      .eq("request_hash", requestHash)
      .maybeSingle();

    if (existingError || !existing) {
      throw new Error(
        existingError?.message || "Failed to resolve duplicate tenant approval"
      );
    }

    if (
      existing.status === "rejected" ||
      existing.status === "expired" ||
      existing.status === "canceled" ||
      (existing.status === "approved" &&
        typeof existing.expires_at === "string" &&
        new Date(existing.expires_at).getTime() <= Date.now())
    ) {
      const { data: reopened, error: reopenError } = await admin
        .from("tenant_approvals")
        .update({
          status: "pending",
          required_role: input.requiredRole,
          tool_id: input.toolId ?? null,
          request_payload: input.requestPayload,
          decision_payload: {},
          decided_by: null,
          decided_at: null,
          expires_at: expiresAt,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (reopenError || !reopened) {
        throw new Error(reopenError?.message || "Failed to reopen tenant approval");
      }

      return { approvalId: String((reopened as { id: string }).id), deduplicated: false };
    }

    return { approvalId: String((existing as { id: string }).id), deduplicated: true };
  }

  if (error || !data) {
    throw new Error(error?.message || "Failed to enqueue tenant approval");
  }

  const approvalId = String((data as { id: string }).id);

  // Send Discord button notification (non-blocking, dynamic import to avoid breaking tests)
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken) {
    import("./tenant-approval-discord-notifier").then(({ sendDiscordApprovalButtonMessage }) =>
      sendDiscordApprovalButtonMessage(admin, botToken, {
        id: approvalId,
        tenant_id: input.tenantId,
        approval_type: input.approvalType,
        required_role: input.requiredRole,
        request_payload: input.requestPayload,
        expires_at: expiresAt,
      })
        .then(async (result) => {
          if (result?.messageId) {
            await admin
              .from("tenant_approvals")
              .update({
                discord_message_id: result.messageId,
                discord_channel_id: result.channelId,
              })
              .eq("id", approvalId);
          }
        })
    ).catch(() => {
      // Non-critical — web dashboard approval still works
    });
  }

  return { approvalId, deduplicated: false };
}
