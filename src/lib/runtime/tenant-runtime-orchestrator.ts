import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import {
  transitionTenantRuntimeRun,
  type TenantRuntimeQueueError,
} from "./tenant-runtime-queue";
import type {
  TenantRuntimeWorker,
  TenantRuntimeWorkerResult,
} from "./tenant-runtime-worker";

export interface TenantRuntimeOrchestratorResult {
  runId: string;
  finalStatus: TenantRuntimeRun["status"];
  workerOutcome: TenantRuntimeWorkerResult["outcome"];
  run: TenantRuntimeRun;
}

function mapOutcomeToEvent(
  outcome: TenantRuntimeWorkerResult["outcome"]
): "complete" | "fail" | "request_approval" {
  if (outcome === "completed") {
    return "complete";
  }
  if (outcome === "awaiting_approval") {
    return "request_approval";
  }
  return "fail";
}

export async function executeTenantRuntimeRun(
  admin: SupabaseClient,
  worker: TenantRuntimeWorker,
  run: TenantRuntimeRun
): Promise<TenantRuntimeOrchestratorResult> {
  const workerResult = await worker.execute({
    run,
    requestTraceId: run.request_trace_id,
  });
  const transitionEvent = mapOutcomeToEvent(workerResult.outcome);
  const transitioned = await transitionTenantRuntimeRun(admin, run, transitionEvent, {
    result: workerResult.result,
    errorMessage: workerResult.errorMessage || null,
    workerId: run.worker_id,
    metadataPatch: {
      orchestrator: "tenant_runtime_orchestrator",
      worker_kind: worker.kind,
    },
  });

  return {
    runId: transitioned.id,
    finalStatus: transitioned.status,
    workerOutcome: workerResult.outcome,
    run: transitioned,
  };
}

export function isTenantRuntimeQueueError(value: unknown): value is TenantRuntimeQueueError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "number"
  );
}
