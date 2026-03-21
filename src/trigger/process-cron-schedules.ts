import { schedules, task, wait } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "./process-runtime-run";
import { computeNextRun } from "@/lib/schedules/compute-next-run";
import { sendCronFailureNotification } from "@/lib/schedules/cron-failure-notifier";

interface ScheduleConfig {
  id: string;
  tenant_id: string;
  customer_id: string;
  schedule_key: string;
  channel_id: string;
  agent_id: string;
  cron_expression: string;
  timezone: string;
  metadata: Record<string, unknown> | null;
  schedule_type: string | null;
  prompt: string | null;
  tools: string[] | null;
  display_name: string | null;
  notify_on_failure: boolean;
  max_retries: number;
  retry_delay_seconds: number;
}

/**
 * Per-schedule executor — runs as its own Trigger.dev task so that retries
 * with `wait.for()` are not constrained by the parent scheduled-task timeout.
 */
export const executeCronSchedule = task({
  id: "execute-cron-schedule",
  retry: { maxAttempts: 1 },
  run: async (payload: { schedule: ScheduleConfig; triggerTimestamp: string }) => {
    const admin = createTriggerAdminClient();
    const { schedule, triggerTimestamp: now } = payload;

    const metadata = (schedule.metadata as Record<string, unknown>) || {};
    const scheduleType = schedule.schedule_type || "predefined";
    const customPrompt = typeof schedule.prompt === "string" ? schedule.prompt : null;
    const customTools = Array.isArray(schedule.tools) ? schedule.tools : [];
    const maxRetries = schedule.max_retries ?? 2;
    const retryDelay = schedule.retry_delay_seconds ?? 60;
    const scheduleName =
      schedule.display_name ||
      schedule.schedule_key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    let lastRunId = "";
    let lastOutcome: "completed" | "failed" = "failed";
    let notificationSent: boolean | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const run = await enqueueDiscordRuntimeRun(admin, {
        runKind: "discord_runtime",
        tenantId: schedule.tenant_id,
        customerId: schedule.customer_id,
        requestTraceId: crypto.randomUUID(),
        idempotencyKey: `cron:${schedule.id}:${now.slice(0, 16)}:attempt${attempt}`,
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
          retry_attempt: attempt,
        },
      });

      lastRunId = run.id;

      await processRuntimeRun.triggerAndWait({ runId: run.id });

      const { data: completedRun } = await admin
        .from("tenant_runtime_runs")
        .select("status, error_message")
        .eq("id", run.id)
        .maybeSingle();

      if (completedRun?.status === "completed") {
        lastOutcome = "completed";
        break;
      }

      if (attempt < maxRetries) {
        await wait.for({ seconds: retryDelay });
        continue;
      }

      // All retries exhausted
      lastOutcome = "failed";

      if (schedule.notify_on_failure) {
        const errorMsg = completedRun?.error_message || "Unknown error";
        const notification = await sendCronFailureNotification(admin, {
          tenantId: schedule.tenant_id,
          channelId: schedule.channel_id,
          scheduleName,
          errorMessage: errorMsg,
          retryAttempt: attempt,
          maxRetries,
        });
        notificationSent = notification.sent;
      }
    }

    // Update next run time
    const timezone = schedule.timezone || "America/Chicago";
    const nextRun = computeNextRun(schedule.cron_expression, timezone);
    await admin
      .from("tenant_scheduled_messages")
      .update({
        last_run_at: now,
        next_run_at: nextRun,
      })
      .eq("id", schedule.id);

    return {
      scheduleId: schedule.id,
      runId: lastRunId,
      outcome: lastOutcome,
      notificationSent,
    };
  },
});

/**
 * Cron scanner — runs every minute, finds due schedules, and dispatches
 * each to `executeCronSchedule` in parallel. Completes quickly so it is
 * never killed by the scheduled-task timeout.
 */
export const processCronSchedules = schedules.task({
  id: "process-cron-schedules",
  cron: "*/1 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();
    const now = new Date().toISOString();

    const { data: dueSchedules, error } = await admin
      .from("tenant_scheduled_messages")
      .select(
        "id, tenant_id, customer_id, schedule_key, channel_id, agent_id, cron_expression, timezone, metadata, schedule_type, prompt, tools, display_name, notify_on_failure, max_retries, retry_delay_seconds"
      )
      .eq("enabled", true)
      .lte("next_run_at", now)
      .limit(50);

    if (error || !dueSchedules?.length) {
      return { dispatched: 0, error: error?.message };
    }

    const dispatched: string[] = [];

    for (const rawSchedule of dueSchedules) {
      const schedule = rawSchedule as unknown as ScheduleConfig;

      try {
        await executeCronSchedule.trigger({
          schedule,
          triggerTimestamp: now,
        });
        dispatched.push(schedule.id);
      } catch (triggerError) {
        // If trigger fails for one schedule, continue with the rest
        console.error(
          `[cron] Failed to dispatch schedule ${schedule.id}:`,
          triggerError instanceof Error ? triggerError.message : triggerError
        );
      }
    }

    return { dispatched: dispatched.length, scheduleIds: dispatched };
  },
});
