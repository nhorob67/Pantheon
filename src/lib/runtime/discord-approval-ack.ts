import type { SupabaseClient } from "@supabase/supabase-js";

const RECENT_APPROVAL_WINDOW_MS = 15 * 60 * 1000;
const APPROVAL_ACK_ONLY_PATTERNS = [
  /^(?:i\s+)?approved(?:\s+it|\s+that)?[.!]*$/i,
  /^(?:it'?s|it\s+is)\s+approved[.!]*$/i,
  /^(?:already\s+)?approved[.!]*$/i,
];

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, " ");
}

function resolveApprovalChannelId(row: {
  discord_channel_id?: unknown;
  request_payload?: unknown;
}): string | null {
  const directChannelId = pickString(row.discord_channel_id);
  if (directChannelId) {
    return directChannelId;
  }

  const requestPayload =
    row.request_payload && typeof row.request_payload === "object" && !Array.isArray(row.request_payload)
      ? (row.request_payload as Record<string, unknown>)
      : null;
  if (!requestPayload) {
    return null;
  }

  return pickString(requestPayload.channel_id) ?? pickString(requestPayload.delivery_channel_id);
}

export function isApprovalAckOnlyMessage(content: string): boolean {
  const normalized = normalizeContent(content);
  if (!normalized || normalized.length > 80) {
    return false;
  }

  return APPROVAL_ACK_ONLY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isRecentApprovedAckCandidate(
  row: {
    decided_at?: unknown;
    discord_channel_id?: unknown;
    request_payload?: unknown;
  },
  input: {
    channelId: string;
    now?: Date;
  }
): boolean {
  const decidedAt = pickString(row.decided_at);
  if (!decidedAt) {
    return false;
  }

  const decidedAtMs = new Date(decidedAt).getTime();
  if (!Number.isFinite(decidedAtMs)) {
    return false;
  }

  const nowMs = (input.now ?? new Date()).getTime();
  if (nowMs - decidedAtMs > RECENT_APPROVAL_WINDOW_MS) {
    return false;
  }

  return resolveApprovalChannelId(row) === input.channelId;
}

export async function findRecentApprovedChannelApproval(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    decidedByUserId: string | null;
    channelId: string;
    now?: Date;
  }
): Promise<{ approvalId: string; decidedAt: string } | null> {
  if (!input.decidedByUserId) {
    return null;
  }

  const cutoffIso = new Date(
    (input.now ?? new Date()).getTime() - RECENT_APPROVAL_WINDOW_MS
  ).toISOString();

  const { data } = await admin
    .from("tenant_approvals")
    .select("id, decided_at, discord_channel_id, request_payload")
    .eq("tenant_id", input.tenantId)
    .eq("status", "approved")
    .eq("decided_by", input.decidedByUserId)
    .gte("decided_at", cutoffIso)
    .order("decided_at", { ascending: false })
    .limit(10);

  for (const row of data ?? []) {
    if (
      isRecentApprovedAckCandidate(
        row as {
          decided_at?: unknown;
          discord_channel_id?: unknown;
          request_payload?: unknown;
        },
        {
          channelId: input.channelId,
          now: input.now,
        }
      )
    ) {
      const approvalId = pickString((row as { id?: unknown }).id);
      const decidedAt = pickString((row as { decided_at?: unknown }).decided_at);
      if (approvalId && decidedAt) {
        return { approvalId, decidedAt };
      }
    }
  }

  return null;
}
