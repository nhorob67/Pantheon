import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { getDiscordTokenFromChannelConfig } from "@/lib/channel-token";
import { sendDiscordChannelMessage } from "./tenant-runtime-discord";
import { resolveCanonicalLegacyInstanceForTenant } from "./tenant-agents";
import { patchTenantRuntimeRunMetadata } from "./tenant-runtime-queue";
import {
  buildDiscordRuntimeCompletionNotificationContent,
  shouldSendDiscordRuntimeCompletionNotification,
} from "./tenant-runtime-status-notifier-utils";

const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

async function resolveDiscordBotToken(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const envToken = process.env[DISCORD_BOT_TOKEN_ENV];
  if (envToken && envToken.trim().length > 0) {
    return envToken;
  }

  const mapping = await resolveCanonicalLegacyInstanceForTenant(admin, tenantId).catch(
    () => ({ instanceId: null, ambiguous: false })
  );

  if (!mapping.instanceId) {
    return null;
  }

  const { data: instance } = await admin
    .from("instances")
    .select("channel_config")
    .eq("id", mapping.instanceId)
    .maybeSingle();

  if (!instance) {
    return null;
  }

  try {
    return getDiscordTokenFromChannelConfig(instance.channel_config);
  } catch {
    return null;
  }
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
