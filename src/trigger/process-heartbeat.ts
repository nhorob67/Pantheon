import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { processRuntimeRun } from "./process-runtime-run";
import {
  computeHeartbeatNextRunAt,
} from "@/lib/heartbeat/schedule";
import {
  executeHeartbeatForConfig,
  resolveHeartbeatConfig,
  type HeartbeatConfigRow,
} from "@/lib/heartbeat/processor";
import { resolveEffectiveScheduledConfigs } from "@/lib/heartbeat/effective-configs";

export const processHeartbeat = schedules.task({
  id: "process-heartbeat",
  cron: "*/1 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Query due heartbeat configs
    const { data: dueConfigs, error } = await admin
      .from("tenant_heartbeat_configs")
      .select(
        "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, cooldown_minutes, max_alerts_per_day, digest_enabled, digest_window_minutes, reminder_interval_minutes, heartbeat_instructions, last_run_at, next_run_at"
      )
      .eq("enabled", true)
      .lte("next_run_at", nowIso)
      .limit(50);

    if (error || !dueConfigs?.length) {
      return { processed: 0, error: error?.message };
    }

    const resolvedConfigs = (dueConfigs as HeartbeatConfigRow[]).map(resolveHeartbeatConfig);
    const { executable, shadowedDefaults } = resolveEffectiveScheduledConfigs(resolvedConfigs);

    for (const config of shadowedDefaults) {
      await admin
        .from("tenant_heartbeat_configs")
        .update({
          next_run_at: computeHeartbeatNextRunAt(config.interval_minutes, now),
        })
        .eq("id", config.id);
    }

    const results: Array<{ configId: string; hadSignal?: boolean; runId?: string; status: string }> = [];

    for (const config of executable) {
      const result = await executeHeartbeatForConfig({
        admin,
        config,
        triggerMode: "scheduled",
        now,
        requestTraceId: crypto.randomUUID(),
        respectActiveHours: true,
        updateSchedule: true,
      });

      if (result.runtimeRunId) {
        await processRuntimeRun.trigger({ runId: result.runtimeRunId });
      }

      results.push({
        configId: result.configId,
        hadSignal: result.hadSignal,
        runId: result.runtimeRunId,
        status: result.status,
      });
    }

    return { processed: results.length, results };
  },
});
