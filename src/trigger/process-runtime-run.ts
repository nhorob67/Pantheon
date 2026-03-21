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
} from "@/lib/runtime/tenant-runtime-queue";
import { sendAsyncDelegationLifecycleUpdate } from "@/lib/runtime/tenant-runtime-discord-lifecycle";
import { executeTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-orchestrator";
import type { TenantRuntimeWorker } from "@/lib/runtime/tenant-runtime-worker";

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

    // Only execute runs that this invocation successfully claims from "queued".
    // If the run is already "running", it belongs to another worker — skip.
    // Recovery of stuck "running" rows is the responsibility of stale-run recovery,
    // not Trigger.dev retry re-entry.
    if (run.status !== "queued") {
      return { skipped: true, reason: "not_claimable", status: run.status };
    }

    const claimedById = await claimTenantRuntimeRunById(
      admin,
      payload.runId,
      "trigger-dev",
      120
    );
    if (!claimedById) {
      return { skipped: true, reason: "claim_lost", runId: payload.runId };
    }

    const claimed = claimedById;

    const resolvedModels = await resolveModels(admin, claimed.tenant_id);
    const worker: TenantRuntimeWorker = (claimed.run_kind === "delegation_runtime"
      ? createDelegationAiWorker(admin)
      : claimed.run_kind === "email_runtime"
        ? createEmailAiWorker(admin)
        : claimed.run_kind === "discord_heartbeat"
          ? createHeartbeatAiWorker(admin)
          : createTenantAiWorker(admin)) as TenantRuntimeWorker;
    const outcome = await executeTenantRuntimeRun(admin, worker, claimed, {
      requestTraceId: claimed.request_trace_id,
      resolvedModels,
    });
    const transitionedRun = outcome.run;

    if (outcome.finalStatus === "failed" && claimed.parent_run_id && claimed.run_kind === "delegation_runtime") {
      await releaseAsyncDelegationBudgetReservation(admin, {
        parentRunId: claimed.parent_run_id,
        childRunId: claimed.id,
      }).catch(() => {});
    }

    if (transitionedRun && claimed.run_kind === "delegation_runtime") {
      await sendAsyncDelegationLifecycleUpdate(admin, transitionedRun).catch(() => {});
    }

    return {
      outcome: outcome.workerOutcome,
      runId: payload.runId,
      tenantId: claimed.tenant_id,
    };
  },
});
