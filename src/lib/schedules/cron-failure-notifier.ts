import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiscordTokenFromChannelConfig } from "@/lib/channel-token";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { sendDiscordChannelMessage } from "@/lib/runtime/tenant-runtime-discord";

interface FailureNotificationInput {
  tenantId: string;
  channelId: string;
  scheduleName: string;
  errorMessage: string;
  retryAttempt: number;
  maxRetries: number;
}

const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per schedule
const recentNotifications = new Map<string, number>();

/**
 * Resolve the Discord bot token, preferring the DISCORD_BOT_TOKEN env var
 * (same source the AI worker uses) and falling back to legacy instance config.
 */
async function resolveDiscordBotToken(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const envToken = process.env.DISCORD_BOT_TOKEN;
  if (envToken && envToken.trim().length > 0) {
    return envToken;
  }

  // Fallback: legacy instance channel_config lookup
  try {
    const mapping = await resolveCanonicalLegacyInstanceForTenant(admin, tenantId);
    if (!mapping.instanceId) return null;

    const { data } = await admin
      .from("instances")
      .select("id, channel_config")
      .eq("id", mapping.instanceId)
      .maybeSingle();

    if (!data) return null;

    return getDiscordTokenFromChannelConfig(
      (data as { channel_config: unknown }).channel_config
    );
  } catch {
    return null;
  }
}

/**
 * Send a Discord failure notification for a cron schedule.
 * Rate-limited to max 1 notification per schedule per hour.
 */
export async function sendCronFailureNotification(
  admin: SupabaseClient,
  input: FailureNotificationInput
): Promise<{ sent: boolean; reason?: string }> {
  // Rate limit: check if we recently sent a notification for this schedule
  const cacheKey = `${input.tenantId}:${input.channelId}:${input.scheduleName}`;
  const lastSent = recentNotifications.get(cacheKey);
  if (lastSent && Date.now() - lastSent < NOTIFICATION_COOLDOWN_MS) {
    return { sent: false, reason: "rate_limited" };
  }

  const botToken = await resolveDiscordBotToken(admin, input.tenantId);
  if (!botToken) {
    return { sent: false, reason: "token_resolution_failed" };
  }

  const retryInfo =
    input.maxRetries > 0
      ? ` (failed after ${input.retryAttempt + 1}/${input.maxRetries + 1} attempts)`
      : "";

  const message = [
    `**Schedule Failed:** ${input.scheduleName}${retryInfo}`,
    `> ${input.errorMessage.slice(0, 200)}`,
    "",
    "Check your schedule activity in the dashboard for details.",
  ].join("\n");

  try {
    await sendDiscordChannelMessage({
      botToken,
      channelId: input.channelId,
      content: message,
    });

    recentNotifications.set(cacheKey, Date.now());
    return { sent: true };
  } catch {
    return { sent: false, reason: "discord_send_failed" };
  }
}
