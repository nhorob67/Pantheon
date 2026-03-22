import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { sendDiscordChannelMessage } from "./tenant-runtime-discord";
import { patchTenantRuntimeRunMetadata } from "./tenant-runtime-queue";
import { dispatchDiscordRuntimeTerminalFailure } from "./discord-runtime-reply-orchestrator";
import {
  buildDiscordRuntimeCompletionNotificationContent,
  shouldSendDiscordRuntimeCompletionNotification,
} from "./tenant-runtime-status-notifier-utils";
import { resolveDiscordBotToken } from "./tenant-runtime-discord-lifecycle";

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

export interface DiscordRuntimeTerminalSafetyNetResult {
  owned: boolean;
  sent: boolean;
  mode: "terminal_failure" | "completion_notification" | "none";
  run: TenantRuntimeRun;
}

export async function sendDiscordRuntimeCompletionNotification(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<TenantRuntimeRun> {
  if (!shouldSendDiscordRuntimeCompletionNotification(run)) {
    return run;
  }

  const channelId = pickString(run.payload.channel_id);
  if (!channelId) {
    return run;
  }

  const content = buildDiscordRuntimeCompletionNotificationContent(run);
  if (!content) {
    return run;
  }

  try {
    const botToken = await resolveDiscordBotToken(admin, run.tenant_id);
    if (!botToken) {
      return run;
    }

    const replyToMessageId = pickString(run.payload.message_id);
    const sent = await sendDiscordChannelMessage({
      botToken,
      channelId,
      content,
      replyToMessageId,
    });

    return await patchTenantRuntimeRunMetadata(admin, run, {
      completion_notification_event: run.status,
      completion_notification_sent_at: new Date().toISOString(),
      completion_notification_message_id: sent.messageId,
      completion_notification_status: sent.status,
    });
  } catch (error) {
    console.error("[runtime-status-notifier] Failed to send Discord completion notification:", safeErrorMessage(error));
    return run;
  }
}

export async function sendDiscordRuntimeTerminalSafetyNet(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<DiscordRuntimeTerminalSafetyNetResult> {
  if (run.run_kind !== "discord_runtime") {
    return {
      owned: false,
      sent: false,
      mode: "none",
      run,
    };
  }

  if (run.status === "failed") {
    const dispatch = await dispatchDiscordRuntimeTerminalFailure(admin, run, {
      errorMessage: run.error_message,
    }).catch((error) => {
      console.error(
        "[runtime-status-notifier] Failed to dispatch Discord terminal failure:",
        safeErrorMessage(error)
      );
      return { owned: false, sent: false };
    });

    if (dispatch.owned) {
      return {
        owned: true,
        sent: dispatch.sent,
        mode: dispatch.sent ? "terminal_failure" : "none",
        run,
      };
    }
  }

  const previousSentAt = pickString(run.metadata.completion_notification_sent_at);
  const nextRun = await sendDiscordRuntimeCompletionNotification(admin, run);
  const nextSentAt = pickString(nextRun.metadata.completion_notification_sent_at);
  const sent = previousSentAt !== nextSentAt && nextSentAt !== null;

  return {
    owned: false,
    sent,
    mode: sent ? "completion_notification" : "none",
    run: nextRun,
  };
}
