import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeObligation } from "@/types/obligation";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { sendDiscordChannelMessage } from "./tenant-runtime-discord";
import { recordUserUpdate } from "./obligation-coordinator";
import { resolveDiscordBotToken } from "./tenant-runtime-discord-lifecycle";
import type { ObligationEventType } from "@/types/obligation";

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function pickObligationRunKind(obligation: RuntimeObligation): string | null {
  return pickString(obligation.metadata.run_kind);
}

function hasDiscordDeliveryContext(obligation: RuntimeObligation): boolean {
  return pickString(obligation.channel_id) !== null || pickString(obligation.reply_to_message_id) !== null;
}

function isDiscordConversationObligation(obligation: RuntimeObligation): boolean {
  const runKind = pickObligationRunKind(obligation)?.toLowerCase();
  if (runKind?.startsWith("discord_")) {
    return true;
  }

  const source = pickString(obligation.metadata.source)?.toLowerCase();
  if (source?.startsWith("discord") === true) {
    return true;
  }

  return hasDiscordDeliveryContext(obligation);
}

export function shouldSendLegacyDiscordObligationStatusReply(
  obligation: RuntimeObligation,
  eventType?: string
): boolean {
  const normalizedEventType = pickString(eventType) as ObligationEventType | null;
  if (!isDiscordConversationObligation(obligation)) {
    return true;
  }

  // Discord conversation visibility should flow through the reply orchestrator
  // or the shared terminal safety-net path, not obligation-side canned prose.
  return normalizedEventType === "approval_rejected";
}

export async function sendDiscordObligationStatusReply(
  admin: SupabaseClient,
  obligation: RuntimeObligation,
  input: {
    content: string;
    runId?: string | null;
    eventType?: string;
  }
): Promise<boolean> {
  const channelId = pickString(obligation.channel_id);
  const content = pickString(input.content);

  if (!channelId || !content) {
    return false;
  }

  if (!shouldSendLegacyDiscordObligationStatusReply(obligation, input.eventType)) {
    return false;
  }

  try {
    const botToken = await resolveDiscordBotToken(admin, obligation.tenant_id);
    if (!botToken) {
      return false;
    }

    await sendDiscordChannelMessage({
      botToken,
      channelId,
      content,
      replyToMessageId: pickString(obligation.reply_to_message_id),
    });

    await recordUserUpdate(admin, obligation.id, input.runId ?? null, {
      event_type: input.eventType ?? "status_reply",
      content_preview: content.slice(0, 160),
    });

    return true;
  } catch (error) {
    console.error(
      "[obligation-discord-notifier] Failed to send obligation status reply:",
      safeErrorMessage(error)
    );
    return false;
  }
}

export function buildApprovalGrantedReply(): string {
  return "Got it, resuming.";
}

export function buildStalledReply(): string {
  return "Quick update - this is taking longer than expected, but I'm still tracking it and will report back here.";
}

export function buildStalledFailureReply(): string {
  return "Task failed. I lost progress on this before I could finish it.";
}
