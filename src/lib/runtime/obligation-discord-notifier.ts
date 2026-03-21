import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuntimeObligation } from "@/types/obligation";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { sendDiscordChannelMessage } from "./tenant-runtime-discord";
import { recordUserUpdate } from "./obligation-coordinator";
import { resolveDiscordBotToken } from "./tenant-runtime-discord-lifecycle";

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
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
  return "Approval received. Resuming now.";
}

export function buildStalledReply(): string {
  return "Quick update - this is taking longer than expected, but I'm still tracking it and will report back here.";
}

export function buildStalledFailureReply(): string {
  return "Task failed. I lost progress on this before I could finish it.";
}
