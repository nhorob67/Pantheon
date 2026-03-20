import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { transitionTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { sendDiscordRuntimeCompletionNotification } from "@/lib/runtime/tenant-runtime-status-notifier";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";

const STALE_LOCK_THRESHOLD_MINUTES = 5;
const BATCH_LIMIT = 100;

const STALE_RUN_SELECT = [
  "id",
  "tenant_id",
  "customer_id",
  "run_kind",
  "source",
  "status",
  "attempt_count",
  "max_attempts",
  "idempotency_key",
  "request_trace_id",
  "correlation_id",
  "payload",
  "result",
  "error_message",
  "queued_at",
  "started_at",
  "completed_at",
  "canceled_at",
  "lock_expires_at",
  "worker_id",
  "parent_run_id",
  "delegation_depth",
  "deadline_at",
  "delegation_kind",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

export const reapStaleRuns = schedules.task({
  id: "reap-stale-runs",
  cron: "*/5 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();
    const cutoff = new Date(
      Date.now() - STALE_LOCK_THRESHOLD_MINUTES * 60 * 1000
    ).toISOString();

    // Find runs in "running" status whose lock expired more than 5 minutes ago
    const { data: staleRunning, error: runningError } = await admin
      .from("tenant_runtime_runs")
      .select(STALE_RUN_SELECT)
      .eq("status", "running")
      .lt("lock_expires_at", cutoff)
      .order("lock_expires_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (runningError) {
      return { error: runningError.message, reaped: 0 };
    }

    // Also find runs stuck in "queued" with no worker for over 10 minutes
    const queuedCutoff = new Date(
      Date.now() - 10 * 60 * 1000
    ).toISOString();

    const { data: staleQueued, error: queuedError } = await admin
      .from("tenant_runtime_runs")
      .select(STALE_RUN_SELECT)
      .eq("status", "queued")
      .is("worker_id", null)
      .lt("created_at", queuedCutoff)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (queuedError) {
      return { error: queuedError.message, reaped: 0 };
    }

    const staleRuns = [...(staleRunning || []), ...(staleQueued || [])];
    if (staleRuns.length === 0) {
      return { reaped: 0 };
    }

    const results: Array<{
      runId: string;
      tenantId: string;
      previousStatus: string;
      outcome: "failed" | "canceled" | "skipped";
      staleSince: string | null;
    }> = [];

    for (const row of staleRuns) {
      const run = row as unknown as TenantRuntimeRun;
      try {
        const event = run.status === "running" ? "fail" : "cancel";
        const transitioned = await transitionTenantRuntimeRun(admin, run, event, {
          errorMessage: `Reaped by stale-lock reaper: ${run.status} run with expired lock (lock_expires_at=${run.lock_expires_at}, created_at=${run.created_at})`,
          metadataPatch: {
            reaped: true,
            reaped_at: new Date().toISOString(),
            reaper_reason:
              run.status === "running"
                ? "lock_expired"
                : "queued_without_claim",
          },
        });

        // Notify Discord for reaped discord_runtime runs via shared notifier
        if (event === "fail" && run.run_kind === "discord_runtime") {
          await sendDiscordRuntimeCompletionNotification(admin, transitioned).catch((err) => {
            console.error(`[reap-stale-runs] Failed to notify Discord for run ${run.id}:`, err);
          });
        }

        results.push({
          runId: run.id,
          tenantId: run.tenant_id,
          previousStatus: run.status,
          outcome: event === "fail" ? "failed" : "canceled",
          staleSince: run.lock_expires_at || run.created_at,
        });
      } catch {
        // Run may have already transitioned — skip
        results.push({
          runId: run.id,
          tenantId: run.tenant_id,
          previousStatus: run.status,
          outcome: "skipped",
          staleSince: run.lock_expires_at || run.created_at,
        });
      }
    }

    const reaped = results.filter((r) => r.outcome !== "skipped").length;
    return { reaped, total_checked: staleRuns.length, results };
  },
});
