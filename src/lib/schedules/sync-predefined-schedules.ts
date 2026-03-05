import type { SupabaseClient } from "@supabase/supabase-js";
import { CRON_JOB_INFO, type AvailableCronJob } from "@/types/agent";
import { computeNextRun } from "./compute-next-run";

/**
 * Syncs an agent's predefined cron_jobs toggles into
 * tenant_scheduled_messages rows so the cron processor can execute them.
 *
 * Resolves timezone from farm_profiles and channel from agent config.
 * Runs fire-and-forget — errors are logged but don't block agent save.
 */
export async function syncPredefinedSchedulesToTable(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  agentId: string,
  agentChannelId: string | null,
  cronJobs: Record<string, boolean>
): Promise<void> {
  const entries = Object.entries(cronJobs);
  if (entries.length === 0) return;

  // Resolve timezone from farm_profiles
  const { data: farmProfile } = await admin
    .from("farm_profiles")
    .select("timezone")
    .eq("customer_id", customerId)
    .maybeSingle();

  const timezone = farmProfile?.timezone || "America/Chicago";

  // Resolve channel_id: use agent's bound channel, else tenant's default channel
  let channelId = agentChannelId || "";
  if (!channelId) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .maybeSingle();

    const config = (tenant?.config ?? {}) as Record<string, unknown>;
    channelId = typeof config.default_channel_id === "string"
      ? config.default_channel_id
      : "";
  }

  if (!channelId) {
    // No channel available — can't create schedule rows without a channel
    return;
  }

  for (const [cronKey, enabled] of entries) {
    const info = CRON_JOB_INFO[cronKey as AvailableCronJob];
    if (!info) continue;

    // Convert hyphenated key to underscore for schedule_key (matches CRON_PROMPTS)
    const scheduleKey = cronKey.replace(/-/g, "_");

    const nextRunAt = enabled
      ? computeNextRun(info.schedule, timezone)
      : null;

    const { error } = await admin
      .from("tenant_scheduled_messages")
      .upsert(
        {
          tenant_id: tenantId,
          customer_id: customerId,
          agent_id: agentId,
          channel_id: channelId,
          schedule_key: scheduleKey,
          cron_expression: info.schedule,
          timezone,
          enabled,
          next_run_at: nextRunAt,
          schedule_type: "predefined",
          display_name: info.label,
          prompt: null,
          tools: [],
          created_by: "system",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_id,agent_id,schedule_key",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error(
        `[sync-predefined] Failed to upsert schedule ${scheduleKey} for agent ${agentId}:`,
        error.message
      );
    }
  }
}
