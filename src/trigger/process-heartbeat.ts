import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "./process-runtime-run";
import { runCheapChecks } from "@/lib/heartbeat/cheap-checks";
import type { HeartbeatChecks } from "@/types/heartbeat";

const DEFAULT_CHECKS: HeartbeatChecks = {
  weather_severe: true,
  grain_price_movement: true,
  grain_price_threshold_cents: 10,
  unreviewed_tickets: true,
  unreviewed_tickets_threshold_hours: 4,
  unanswered_emails: true,
  unanswered_emails_threshold_hours: 2,
};

function isWithinActiveHours(
  timezone: string,
  start: string,
  end: string
): boolean {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const currentTime = `${hour}:${minute}`;

    return currentTime >= start && currentTime < end;
  } catch {
    return true; // default to allowing if timezone parsing fails
  }
}

interface HeartbeatConfigRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  enabled: boolean;
  interval_minutes: number;
  timezone: string;
  active_hours_start: string;
  active_hours_end: string;
  checks: unknown;
  custom_checks: string[] | null;
  delivery_channel_id: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

function parseChecks(raw: unknown): HeartbeatChecks {
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      weather_severe: obj.weather_severe === true,
      grain_price_movement: obj.grain_price_movement === true,
      grain_price_threshold_cents:
        typeof obj.grain_price_threshold_cents === "number"
          ? obj.grain_price_threshold_cents
          : DEFAULT_CHECKS.grain_price_threshold_cents,
      unreviewed_tickets: obj.unreviewed_tickets === true,
      unreviewed_tickets_threshold_hours:
        typeof obj.unreviewed_tickets_threshold_hours === "number"
          ? obj.unreviewed_tickets_threshold_hours
          : DEFAULT_CHECKS.unreviewed_tickets_threshold_hours,
      unanswered_emails: obj.unanswered_emails === true,
      unanswered_emails_threshold_hours:
        typeof obj.unanswered_emails_threshold_hours === "number"
          ? obj.unanswered_emails_threshold_hours
          : DEFAULT_CHECKS.unanswered_emails_threshold_hours,
    };
  }
  return DEFAULT_CHECKS;
}

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
        "id, tenant_id, customer_id, agent_id, enabled, interval_minutes, timezone, active_hours_start, active_hours_end, checks, custom_checks, delivery_channel_id, last_run_at, next_run_at"
      )
      .eq("enabled", true)
      .lte("next_run_at", nowIso)
      .limit(50);

    if (error || !dueConfigs?.length) {
      return { processed: 0, error: error?.message };
    }

    const results: Array<{ configId: string; hadSignal: boolean; runId?: string }> = [];

    for (const rawConfig of dueConfigs as HeartbeatConfigRow[]) {
      // 2. Check active hours
      if (
        !isWithinActiveHours(
          rawConfig.timezone,
          rawConfig.active_hours_start,
          rawConfig.active_hours_end
        )
      ) {
        // Outside active hours — just bump next_run_at
        const nextRunAt = new Date(
          now.getTime() + rawConfig.interval_minutes * 60 * 1000
        ).toISOString();
        await admin
          .from("tenant_heartbeat_configs")
          .update({ next_run_at: nextRunAt })
          .eq("id", rawConfig.id);
        continue;
      }

      const startTime = Date.now();
      const checks = parseChecks(rawConfig.checks);
      const customChecks = rawConfig.custom_checks || [];

      // 3. Run cheap checks
      let checksOutput;
      try {
        checksOutput = await runCheapChecks({
          admin,
          tenantId: rawConfig.tenant_id,
          customerId: rawConfig.customer_id,
          checks,
          customChecks,
        });
      } catch (err) {
        // Log failed heartbeat run
        await admin.from("tenant_heartbeat_runs").insert({
          config_id: rawConfig.id,
          tenant_id: rawConfig.tenant_id,
          ran_at: nowIso,
          checks_executed: {},
          had_signal: false,
          llm_invoked: false,
          duration_ms: Date.now() - startTime,
          error_message: err instanceof Error ? err.message : "Cheap checks failed",
        });

        const nextRunAt = new Date(
          now.getTime() + rawConfig.interval_minutes * 60 * 1000
        ).toISOString();
        await admin
          .from("tenant_heartbeat_configs")
          .update({ last_run_at: nowIso, next_run_at: nextRunAt })
          .eq("id", rawConfig.id);
        continue;
      }

      const durationMs = Date.now() - startTime;

      // 4. Log heartbeat run
      const { data: heartbeatRun } = await admin
        .from("tenant_heartbeat_runs")
        .insert({
          config_id: rawConfig.id,
          tenant_id: rawConfig.tenant_id,
          ran_at: nowIso,
          checks_executed: checksOutput.results,
          had_signal: checksOutput.hadSignal,
          llm_invoked: checksOutput.hadSignal,
          duration_ms: durationMs,
        })
        .select("id")
        .single();

      let runtimeRunId: string | undefined;

      // 5. If signal detected, enqueue LLM run
      if (checksOutput.hadSignal && rawConfig.delivery_channel_id) {
        // Get farm name for the prompt
        const { data: profile } = await admin
          .from("farm_profiles")
          .select("farm_name")
          .eq("customer_id", rawConfig.customer_id)
          .maybeSingle();

        const run = await enqueueDiscordRuntimeRun(admin, {
          runKind: "discord_heartbeat",
          tenantId: rawConfig.tenant_id,
          customerId: rawConfig.customer_id,
          requestTraceId: crypto.randomUUID(),
          idempotencyKey: `heartbeat:${rawConfig.id}:${nowIso.slice(0, 16)}`,
          payload: {
            channel_id: rawConfig.delivery_channel_id,
            content: `[heartbeat] ${rawConfig.id}`,
            user_id: "system",
            guild_id: null,
            message_id: `heartbeat-${rawConfig.id}-${Date.now()}`,
            run_kind: "discord_heartbeat",
            signal_summaries: checksOutput.signalSummaries,
            signal_data: checksOutput.results,
            farm_name: profile?.farm_name ?? "the farm",
            heartbeat_run_id: heartbeatRun?.id,
          },
          metadata: {
            heartbeat_config_id: rawConfig.id,
            heartbeat_run_id: heartbeatRun?.id,
          },
        });

        await processRuntimeRun.trigger({ runId: run.id });
        runtimeRunId = run.id;
      }

      // 6. Update next_run_at
      const nextRunAt = new Date(
        now.getTime() + rawConfig.interval_minutes * 60 * 1000
      ).toISOString();
      await admin
        .from("tenant_heartbeat_configs")
        .update({ last_run_at: nowIso, next_run_at: nextRunAt })
        .eq("id", rawConfig.id);

      results.push({
        configId: rawConfig.id,
        hadSignal: checksOutput.hadSignal,
        runId: runtimeRunId,
      });
    }

    return { processed: results.length, results };
  },
});
