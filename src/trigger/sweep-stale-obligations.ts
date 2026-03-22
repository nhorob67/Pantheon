import { schedules } from "@trigger.dev/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTriggerAdminClient } from "./lib/supabase";
import {
  listStaleObligations,
  listOverdueObligations,
  transitionObligation,
} from "@/lib/runtime/obligation-coordinator";
import { sendDiscordRuntimeTerminalSafetyNet } from "@/lib/runtime/tenant-runtime-status-notifier";
import {
  buildStalledFailureReply,
  buildStalledReply,
  sendDiscordObligationStatusReply,
} from "@/lib/runtime/obligation-discord-notifier";
import { getTenantRuntimeRunById } from "@/lib/runtime/tenant-runtime-queue";
import type { RuntimeObligation } from "@/types/obligation";

const BATCH_LIMIT = 50;

async function sendTerminalObligationFailureReply(
  admin: SupabaseClient,
  obligation: RuntimeObligation,
  eventType: "failed",
  content: string
): Promise<boolean> {
  const candidateRunIds = [
    obligation.current_run_id,
    obligation.completion_run_id,
    obligation.originating_run_id,
  ].filter((value, index, array): value is string => {
    return typeof value === "string" && value.length > 0 && array.indexOf(value) === index;
  });

  for (const runId of candidateRunIds) {
    const run = await getTenantRuntimeRunById(admin, runId).catch(() => null);
    if (!run) {
      continue;
    }

    const dispatch = await sendDiscordRuntimeTerminalSafetyNet(admin, {
      ...run,
      error_message: run.error_message ?? content.replace(/^Task failed\.\s*/i, ""),
    }).catch(() => ({ owned: false, sent: false, mode: "none" as const, run }));

    if (dispatch.owned || dispatch.sent) {
      return true;
    }
  }

  return sendDiscordObligationStatusReply(admin, obligation, {
    content,
    runId: obligation.current_run_id,
    eventType,
  }).catch(() => false);
}

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
          await sendTerminalObligationFailureReply(
            admin,
            failed,
            "failed",
            buildStalledFailureReply()
          ).catch(() => false);
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
        await sendTerminalObligationFailureReply(
          admin,
          failed,
          "failed",
          buildStalledFailureReply()
        ).catch(() => false);
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
