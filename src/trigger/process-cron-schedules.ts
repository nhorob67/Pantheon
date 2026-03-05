import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "./process-runtime-run";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

export const processCronSchedules = schedules.task({
  id: "process-cron-schedules",
  cron: "*/1 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();
    const now = new Date().toISOString();

    const { data: dueSchedules, error } = await admin
      .from("tenant_scheduled_messages")
      .select(
        "id, tenant_id, customer_id, schedule_key, channel_id, agent_id, cron_expression, timezone, metadata, schedule_type, prompt, tools"
      )
      .eq("enabled", true)
      .lte("next_run_at", now)
      .limit(50);

    if (error || !dueSchedules?.length) {
      return { processed: 0, error: error?.message };
    }

    const results: Array<{ scheduleId: string; runId: string }> = [];

    for (const schedule of dueSchedules) {
      const metadata = (schedule.metadata as Record<string, unknown>) || {};
      const scheduleType = schedule.schedule_type || "predefined";
      const customPrompt = typeof schedule.prompt === "string" ? schedule.prompt : null;
      const customTools = Array.isArray(schedule.tools) ? schedule.tools : [];

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
          schedule_type: scheduleType,
          custom_prompt: customPrompt,
          custom_tools: customTools.length > 0 ? customTools : null,
          briefing_sections: metadata.briefing_sections ?? null,
        },
        metadata: {
          cron_schedule_id: schedule.id,
          cron_expression: schedule.cron_expression,
        },
      });

      // Use cron-parser for correct timezone-aware next run
      const timezone = schedule.timezone || "America/Chicago";
      const nextRun = computeNextRun(schedule.cron_expression, timezone);
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
