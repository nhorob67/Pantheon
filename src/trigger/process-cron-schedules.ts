import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "./process-runtime-run";

export const processCronSchedules = schedules.task({
  id: "process-cron-schedules",
  cron: "*/1 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();
    const now = new Date().toISOString();

    const { data: dueSchedules, error } = await admin
      .from("tenant_scheduled_messages")
      .select("id, tenant_id, customer_id, schedule_key, channel_id, agent_id, cron_expression, metadata")
      .eq("enabled", true)
      .lte("next_run_at", now)
      .limit(50);

    if (error || !dueSchedules?.length) {
      return { processed: 0, error: error?.message };
    }

    const results: Array<{ scheduleId: string; runId: string }> = [];

    for (const schedule of dueSchedules) {
      const metadata = (schedule.metadata as Record<string, unknown>) || {};
      const run = await enqueueDiscordRuntimeRun(admin, {
        runKind: "discord_runtime",
        tenantId: schedule.tenant_id,
        customerId: schedule.customer_id,
        requestTraceId: crypto.randomUUID(),
        idempotencyKey: `cron:${schedule.id}:${now.slice(0, 16)}`,
        payload: {
          channel_id: schedule.channel_id,
          content: `[cron] ${schedule.schedule_key}`,
          user_id: "system",
          guild_id: null,
          message_id: `cron-${schedule.id}-${Date.now()}`,
          run_kind: "discord_cron",
          schedule_key: schedule.schedule_key,
          briefing_sections: metadata.briefing_sections ?? null,
        },
        metadata: {
          cron_schedule_id: schedule.id,
          cron_expression: schedule.cron_expression,
        },
      });

      // Compute next_run_at from cron expression (simple: add 1 day for daily, etc.)
      // For now use a simple approach: bump by the schedule interval
      const nextRun = computeNextRun(schedule.cron_expression);
      await admin
        .from("tenant_scheduled_messages")
        .update({
          last_run_at: now,
          next_run_at: nextRun,
        })
        .eq("id", schedule.id);

      // Fire the run processor
      await processRuntimeRun.trigger({ runId: run.id });
      results.push({ scheduleId: schedule.id, runId: run.id });
    }

    return { processed: results.length, runs: results };
  },
});

function computeNextRun(cronExpression: string): string {
  // Parse simple daily cron: "30 6 * * *" → 06:30 daily
  // For minute-level: "*/5 * * * *" → every 5 min
  const parts = cronExpression.trim().split(/\s+/);
  const now = new Date();

  if (parts[0]?.startsWith("*/")) {
    // Every N minutes
    const interval = parseInt(parts[0].slice(2), 10) || 1;
    return new Date(now.getTime() + interval * 60_000).toISOString();
  }

  // Default: next day at same time
  const minute = parseInt(parts[0] || "0", 10);
  const hour = parseInt(parts[1] || "0", 10);
  const next = new Date(now);
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}
