import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import type { ResolvedModels } from "@/lib/ai/model-resolver";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  transitionTenantRuntimeRun,
  type TenantRuntimeQueueError,
} from "./tenant-runtime-queue";
import {
  bindApprovalToObligation,
  onApprovalRequested,
  onRunCompleted,
  onRunFailed,
  onRunStarted,
} from "./obligation-coordinator";
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

export interface ExecuteTenantRuntimeRunOptions {
  requestTraceId?: string | null;
  resolvedModels?: ResolvedModels;
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

function extractApprovalId(result: Record<string, unknown>): string | null {
  return typeof result.approval_id === "string" ? result.approval_id : null;
}

export async function executeTenantRuntimeRun(
  admin: SupabaseClient,
  worker: TenantRuntimeWorker,
  run: TenantRuntimeRun,
  options?: ExecuteTenantRuntimeRunOptions
): Promise<TenantRuntimeOrchestratorResult> {
  await onRunStarted(admin, run).catch(() => null);

  let workerResult: TenantRuntimeWorkerResult;
  try {
    workerResult = await worker.execute({
      run,
      requestTraceId: options?.requestTraceId ?? run.request_trace_id,
      resolvedModels: options?.resolvedModels,
    });
  } catch (error) {
    const transitioned = await transitionTenantRuntimeRun(admin, run, "fail", {
      errorMessage: safeErrorMessage(error, "Tenant runtime worker failed"),
      result: {
        failed: true,
        orchestrator_error: true,
        processed_at: new Date().toISOString(),
      },
      workerId: run.worker_id,
      metadataPatch: {
        orchestrator: "tenant_runtime_orchestrator",
        worker_kind: worker.kind,
        orchestrator_error: true,
      },
    });

    await onRunFailed(
      admin,
      transitioned,
      transitioned.error_message ?? undefined
    ).catch(() => null);

    return {
      runId: transitioned.id,
      finalStatus: transitioned.status,
      workerOutcome: "failed",
      run: transitioned,
    };
  }

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

  if (transitioned.status === "completed") {
    await onRunCompleted(admin, transitioned).catch(() => null);
  } else if (transitioned.status === "failed") {
    await onRunFailed(
      admin,
      transitioned,
      transitioned.error_message ?? undefined
    ).catch(() => null);
  } else if (transitioned.status === "awaiting_approval") {
    const approvalId = extractApprovalId(transitioned.result);
    if (approvalId) {
      const obligation = await onApprovalRequested(
        admin,
        transitioned,
        approvalId
      ).catch(() => null);
      if (obligation) {
        await bindApprovalToObligation(admin, approvalId, obligation).catch(() => {});
      }
    }
  }

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
