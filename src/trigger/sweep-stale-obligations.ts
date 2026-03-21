import { schedules } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import {
  listStaleObligations,
  listOverdueObligations,
  transitionObligation,
} from "@/lib/runtime/obligation-coordinator";
import {
  buildStalledFailureReply,
  buildStalledReply,
  sendDiscordObligationStatusReply,
} from "@/lib/runtime/obligation-discord-notifier";

const BATCH_LIMIT = 50;

export const sweepStaleObligations = schedules.task({
  id: "sweep-stale-obligations",
  cron: "*/5 * * * *",
  run: async () => {
    const admin = createTriggerAdminClient();

    // Phase 1: stalled obligations (no progress for 10+ minutes)
    const stale = await listStaleObligations(admin, BATCH_LIMIT);

    const staleResults: Array<{
      obligationId: string;
      tenantId: string;
      previousStatus: string;
      outcome: "stalled" | "failed" | "skipped";
    }> = [];

    for (const obligation of stale) {
      try {
        if (obligation.status === "stalled") {
          // Already stalled once — fail it
          const failed = await transitionObligation(admin, {
            obligation,
            event: "fail",
            eventType: "failed",
            idempotencyKey: `sweep_fail:${obligation.id}:${obligation.updated_at}`,
            payload: { reason: "stalled_twice", sweeper: true },
          });
          await sendDiscordObligationStatusReply(admin, failed, {
            content: buildStalledFailureReply(),
            runId: failed.current_run_id,
            eventType: "failed",
          }).catch(() => false);
          staleResults.push({
            obligationId: obligation.id,
            tenantId: obligation.tenant_id,
            previousStatus: obligation.status,
            outcome: "failed",
          });
        } else {
          // First stall — mark stalled, allow one retry
          const stalled = await transitionObligation(admin, {
            obligation,
            event: "stall",
            eventType: "stalled",
            idempotencyKey: `sweep_stall:${obligation.id}:${obligation.updated_at}`,
            payload: { reason: "no_progress", sweeper: true },
          });
          await sendDiscordObligationStatusReply(admin, stalled, {
            content: buildStalledReply(),
            runId: stalled.current_run_id,
            eventType: "stalled",
          }).catch(() => false);
          staleResults.push({
            obligationId: obligation.id,
            tenantId: obligation.tenant_id,
            previousStatus: obligation.status,
            outcome: "stalled",
          });
        }
      } catch {
        staleResults.push({
          obligationId: obligation.id,
          tenantId: obligation.tenant_id,
          previousStatus: obligation.status,
          outcome: "skipped",
        });
      }
    }

    // Phase 2: overdue obligations (past their deadline)
    const overdue = await listOverdueObligations(admin, BATCH_LIMIT);

    const overdueResults: Array<{
      obligationId: string;
      tenantId: string;
      previousStatus: string;
      outcome: "failed" | "skipped";
    }> = [];

    for (const obligation of overdue) {
      try {
        const failed = await transitionObligation(admin, {
          obligation,
          event: "fail",
          eventType: "failed",
          idempotencyKey: `sweep_overdue:${obligation.id}`,
          payload: {
            reason: "deadline_exceeded",
            deadline_at: obligation.deadline_at,
            sweeper: true,
          },
        });
        await sendDiscordObligationStatusReply(admin, failed, {
          content: buildStalledFailureReply(),
          runId: failed.current_run_id,
          eventType: "failed",
        }).catch(() => false);
        overdueResults.push({
          obligationId: obligation.id,
          tenantId: obligation.tenant_id,
          previousStatus: obligation.status,
          outcome: "failed",
        });
      } catch {
        overdueResults.push({
          obligationId: obligation.id,
          tenantId: obligation.tenant_id,
          previousStatus: obligation.status,
          outcome: "skipped",
        });
      }
    }

    return {
      stale: {
        checked: stale.length,
        stalled: staleResults.filter((r) => r.outcome === "stalled").length,
        failed: staleResults.filter((r) => r.outcome === "failed").length,
        results: staleResults,
      },
      overdue: {
        checked: overdue.length,
        failed: overdueResults.filter((r) => r.outcome === "failed").length,
        results: overdueResults,
      },
    };
  },
});
