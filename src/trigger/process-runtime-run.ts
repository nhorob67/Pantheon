import { task } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { createTenantAiWorker } from "@/lib/ai/tenant-ai-worker";
import { createEmailAiWorker } from "@/lib/ai/email-ai-worker";
import { createHeartbeatAiWorker } from "@/lib/ai/heartbeat-ai-worker";
import { createDelegationAiWorker } from "@/lib/ai/delegation-ai-worker";
import { resolveModels } from "@/lib/ai/model-resolver";
import {
  getTenantRuntimeRunById,
  claimTenantRuntimeRunById,
  releaseAsyncDelegationBudgetReservation,
  transitionTenantRuntimeRun,
} from "@/lib/runtime/tenant-runtime-queue";

export const processRuntimeRun = task({
  id: "process-runtime-run",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: { runId: string }) => {
    const admin = createTriggerAdminClient();
    const run = await getTenantRuntimeRunById(admin, payload.runId);

    if (!run) {
      return { skipped: true, reason: "run_not_found", runId: payload.runId };
    }

    // Skip if already terminal
    if (run.status === "completed" || run.status === "failed" || run.status === "canceled") {
      return { skipped: true, reason: "already_terminal", status: run.status };
    }

    // Claim the run if still queued (uses optimistic locking)
    let claimed = run;
    if (run.status === "queued") {
      const claimedById = await claimTenantRuntimeRunById(
        admin,
        payload.runId,
        "trigger-dev",
        120
      );
      if (!claimedById) {
        // Another worker may have claimed it, or it's already running
        const refetch = await getTenantRuntimeRunById(admin, payload.runId);
        if (!refetch || refetch.status !== "running") {
          return { skipped: true, reason: "claim_lost", status: refetch?.status };
        }
        claimed = refetch;
      } else {
        claimed = claimedById;
      }
    }

    if (claimed.status !== "running") {
      return { skipped: true, reason: "not_running", status: claimed.status };
    }

    const resolvedModels = await resolveModels(admin, claimed.tenant_id);
    const worker = claimed.run_kind === "delegation_runtime"
      ? createDelegationAiWorker(admin)
      : claimed.run_kind === "email_runtime"
        ? createEmailAiWorker(admin)
        : claimed.run_kind === "discord_heartbeat"
          ? createHeartbeatAiWorker(admin)
          : createTenantAiWorker(admin);
    const result = await worker.execute({
      run: claimed,
      requestTraceId: claimed.request_trace_id,
      resolvedModels,
    });

    if (result.outcome === "completed") {
      await transitionTenantRuntimeRun(admin, claimed, "complete", {
        result: result.result,
      });
    } else if (result.outcome === "failed") {
      await transitionTenantRuntimeRun(admin, claimed, "fail", {
        result: result.result,
        errorMessage: result.errorMessage ?? "AI worker execution failed",
      });
      if (claimed.parent_run_id && claimed.run_kind === "delegation_runtime") {
        await releaseAsyncDelegationBudgetReservation(admin, {
          parentRunId: claimed.parent_run_id,
          childRunId: claimed.id,
        }).catch(() => {});
      }
    }

    return {
      outcome: result.outcome,
      runId: payload.runId,
      tenantId: claimed.tenant_id,
    };
  },
});
