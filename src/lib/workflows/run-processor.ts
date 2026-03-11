import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWorkflowApprovalInsertRows,
  evaluateWorkflowRunApprovalGate,
  extractRequiredApprovalNodeIds,
  resolveWorkflowApprovalNodes,
} from "./approvals";
import { auditLog } from "@/lib/security/audit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_APPROVAL_STATUSES,
  type WorkflowApprovalStatus,
  type WorkflowRunStatus,
} from "@/types/workflow";

const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 100;
const RUN_PROCESS_CONCURRENCY = 5;
const MAX_ERROR_LENGTH = 2000;

export interface QueuedRun {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  source_version: number;
  runtime_correlation_id: string | null;
  input_payload: unknown;
  metadata: unknown;
}

interface WorkflowDefinitionState {
  id: string;
  status: string;
  published_version: number | null;
}

interface WorkflowVersionSnapshot {
  workflow_id: string;
  version: number;
  graph: unknown;
}

interface WorkflowApprovalRow {
  id: string;
  run_id: string;
  node_id: string;
  status: string;
}

interface RunProcessTotals {
  dispatched: number;
  failed: number;
  skipped: number;
  approvalBlocked: number;
  approvalRejected: number;
}

export interface ProcessWorkflowRunsResult {
  claimed: number;
  dispatched: number;
  failed: number;
  skipped: number;
  approval_blocked: number;
  approval_rejected: number;
  dispatched_run_ids: string[];
}

type DispatchCallback = (run: QueuedRun, runtimeCorrelationId: string) => Promise<void>;

const WORKFLOW_APPROVAL_STATUS_VALUES = new Set<WorkflowApprovalStatus>(
  WORKFLOW_APPROVAL_STATUSES
);

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function errorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function normalizeApprovalStatus(value: unknown): WorkflowApprovalStatus {
  if (
    typeof value === "string" &&
    WORKFLOW_APPROVAL_STATUS_VALUES.has(value as WorkflowApprovalStatus)
  ) {
    return value as WorkflowApprovalStatus;
  }
  return "pending";
}

function createEmptyTotals(): RunProcessTotals {
  return {
    dispatched: 0,
    failed: 0,
    skipped: 0,
    approvalBlocked: 0,
    approvalRejected: 0,
  };
}

/**
 * Process queued workflow runs: validate, evaluate approval gates, and dispatch.
 *
 * The `onDispatch` callback is invoked for each run that passes all gates and is
 * marked as "running". It should trigger the actual execution (e.g. via Trigger.dev).
 */
export async function processQueuedWorkflowRuns(
  admin: SupabaseClient,
  options: {
    batchSize?: number;
    requestTraceId?: string;
    onDispatch: DispatchCallback;
  }
): Promise<ProcessWorkflowRunsResult> {
  const batchSize = Math.min(
    Math.max(options.batchSize ?? DEFAULT_BATCH_SIZE, 1),
    MAX_BATCH_SIZE
  );
  const requestTraceId = options.requestTraceId ?? crypto.randomUUID();

  const { data: queuedData, error: queuedError } = await admin
    .from("workflow_runs")
    .select(
      "id, workflow_id, instance_id, customer_id, source_version, runtime_correlation_id, input_payload, metadata"
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (queuedError) {
    throw new Error(
      safeErrorMessage(queuedError, "Failed to load queued workflow runs")
    );
  }

  const queuedRuns = (queuedData || []) as QueuedRun[];
  if (queuedRuns.length === 0) {
    return {
      claimed: 0,
      dispatched: 0,
      failed: 0,
      skipped: 0,
      approval_blocked: 0,
      approval_rejected: 0,
      dispatched_run_ids: [],
    };
  }

  const workflowIds = Array.from(
    new Set(queuedRuns.map((run) => run.workflow_id))
  );
  const sourceVersions = Array.from(
    new Set(
      queuedRuns
        .map((run) => run.source_version)
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  const runIds = queuedRuns.map((run) => run.id);
  const instanceIds = Array.from(
    new Set(queuedRuns.map((run) => run.instance_id))
  );

  const [
    { data: workflowStatesData, error: workflowStatesError },
    { data: workflowVersionData, error: workflowVersionError },
    { data: instanceRows, error: instanceError },
  ] = await Promise.all([
    admin
      .from("workflow_definitions")
      .select("id, status, published_version")
      .in("id", workflowIds),
    sourceVersions.length > 0
      ? admin
          .from("workflow_versions")
          .select("workflow_id, version, graph")
          .in("workflow_id", workflowIds)
          .in("version", sourceVersions)
      : Promise.resolve({ data: [] as WorkflowVersionSnapshot[], error: null }),
    admin.from("instances").select("id").in("id", instanceIds),
  ]);

  if (workflowStatesError) {
    throw new Error(
      safeErrorMessage(
        workflowStatesError,
        "Failed to load workflow definition state"
      )
    );
  }
  if (workflowVersionError) {
    throw new Error(
      safeErrorMessage(
        workflowVersionError,
        "Failed to load workflow snapshots for queued runs"
      )
    );
  }
  if (instanceError) {
    throw new Error(
      safeErrorMessage(
        instanceError,
        "Failed to load instance metadata for workflow dispatch"
      )
    );
  }

  const workflowStateById = new Map<string, WorkflowDefinitionState>(
    ((workflowStatesData || []) as WorkflowDefinitionState[]).map(
      (workflow) => [workflow.id, workflow]
    )
  );

  const workflowVersionByKey = new Map<string, WorkflowVersionSnapshot>(
    ((workflowVersionData || []) as WorkflowVersionSnapshot[]).map((row) => [
      `${row.workflow_id}:${row.version}`,
      row,
    ])
  );

  const instanceIdSet = new Set(
    ((instanceRows || []) as Array<{ id: string }>).map((row) => row.id)
  );

  // Expire overdue approvals
  const approvalCheckNowIso = new Date().toISOString();
  await admin
    .from("workflow_approvals")
    .update({
      status: "expired",
      expired_at: approvalCheckNowIso,
      decided_at: approvalCheckNowIso,
      decision_comment: "Approval SLA expired.",
    })
    .in("run_id", runIds)
    .eq("status", "pending")
    .lt("sla_due_at", approvalCheckNowIso);

  const { data: approvalRowsData, error: approvalRowsError } = await admin
    .from("workflow_approvals")
    .select("id, run_id, node_id, status")
    .in("run_id", runIds);

  if (approvalRowsError) {
    throw new Error(
      safeErrorMessage(
        approvalRowsError,
        "Failed to load workflow approvals for queued runs"
      )
    );
  }

  const approvalsByRunId = new Map<
    string,
    Array<{ node_id: string; status: WorkflowApprovalStatus }>
  >();

  for (const row of (approvalRowsData || []) as WorkflowApprovalRow[]) {
    const current = approvalsByRunId.get(row.run_id) || [];
    current.push({
      node_id: row.node_id,
      status: normalizeApprovalStatus(row.status),
    });
    approvalsByRunId.set(row.run_id, current);
  }

  const dispatchedRunIds: string[] = [];

  const processQueuedRun = async (
    run: QueuedRun
  ): Promise<RunProcessTotals> => {
    const totals = createEmptyTotals();
    const workflowState = workflowStateById.get(run.workflow_id);
    const workflowVersion = workflowVersionByKey.get(
      `${run.workflow_id}:${run.source_version}`
    );
    const runMetadata = {
      ...normalizeObject(run.metadata),
      request_trace_id: requestTraceId,
    };
    const nowIso = new Date().toISOString();

    try {
      // Validate workflow is still runnable
      if (
        !workflowState ||
        workflowState.status !== "published" ||
        !workflowState.published_version ||
        workflowState.published_version < run.source_version
      ) {
        const { data: failedRow, error: failUpdateError } = await admin
          .from("workflow_runs")
          .update({
            status: "failed" as WorkflowRunStatus,
            error_message:
              "Workflow is no longer runnable in its queued version. Re-publish and retry.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "dispatch_rejected",
              dispatch_error: "workflow_not_runnable",
              dispatch_processed_at: nowIso,
            },
          })
          .eq("id", run.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();

        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }
        totals.failed += 1;
        return totals;
      }

      if (!workflowVersion) {
        const { data: failedRow, error: failUpdateError } = await admin
          .from("workflow_runs")
          .update({
            status: "failed" as WorkflowRunStatus,
            error_message:
              "Workflow snapshot for queued run was not found. Re-publish and retry.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "dispatch_rejected",
              dispatch_error: "workflow_snapshot_missing",
              dispatch_processed_at: nowIso,
            },
          })
          .eq("id", run.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();

        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }
        totals.failed += 1;
        return totals;
      }

      // Evaluate approval gates
      const approvalNodes = resolveWorkflowApprovalNodes(
        workflowVersion.graph,
        new Date(nowIso)
      );
      const requiredApprovalNodeIds =
        extractRequiredApprovalNodeIds(approvalNodes);

      if (requiredApprovalNodeIds.length > 0) {
        let runApprovals = approvalsByRunId.get(run.id) || [];
        let approvalGate = evaluateWorkflowRunApprovalGate(
          requiredApprovalNodeIds,
          runApprovals
        );

        // Backfill missing approval rows
        if (approvalGate.missingNodeIds.length > 0) {
          const missingNodes = approvalNodes.filter((node) =>
            approvalGate.missingNodeIds.includes(node.node_id)
          );

          if (missingNodes.length > 0) {
            const { error: missingApprovalInsertError } = await admin
              .from("workflow_approvals")
              .upsert(
                buildWorkflowApprovalInsertRows({
                  runId: run.id,
                  workflowId: run.workflow_id,
                  instanceId: run.instance_id,
                  customerId: run.customer_id,
                  approvalNodes: missingNodes,
                  source: "processor_backfill",
                }),
                { onConflict: "run_id,node_id", ignoreDuplicates: true }
              );

            if (missingApprovalInsertError) {
              totals.skipped += 1;
              return totals;
            }

            runApprovals = [
              ...runApprovals,
              ...missingNodes.map((node) => ({
                node_id: node.node_id,
                status: "pending" as WorkflowApprovalStatus,
              })),
            ];
            approvalsByRunId.set(run.id, runApprovals);
            approvalGate = evaluateWorkflowRunApprovalGate(
              requiredApprovalNodeIds,
              runApprovals
            );
          }
        }

        const approvalGateMetadata = {
          required: requiredApprovalNodeIds.length,
          missing: approvalGate.missingNodeIds.length,
          pending: approvalGate.pendingNodeIds.length,
          approved: approvalGate.approvedNodeIds.length,
          rejected: approvalGate.rejectedNodeIds.length,
          checked_at: nowIso,
        };

        if (approvalGate.hasTerminalRejection) {
          const { data: rejectedRow, error: rejectUpdateError } = await admin
            .from("workflow_runs")
            .update({
              status: "approval_rejected" as WorkflowRunStatus,
              error_message: "Workflow run rejected during approval.",
              completed_at: nowIso,
              metadata: {
                ...runMetadata,
                runtime_state: "approval_rejected",
                approval_gate: approvalGateMetadata,
                approval_rejected_at: nowIso,
                dispatch_processed_at: nowIso,
              },
            })
            .eq("id", run.id)
            .eq("status", "queued")
            .select("id")
            .maybeSingle();

          if (rejectUpdateError || !rejectedRow) {
            totals.skipped += 1;
            return totals;
          }

          await admin
            .from("workflow_run_steps")
            .update({
              status: "canceled",
              completed_at: nowIso,
              error_message: "Workflow run rejected during approval.",
            })
            .eq("run_id", run.id)
            .eq("instance_id", run.instance_id)
            .in("status", ["pending", "running"]);

          totals.approvalRejected += 1;

          auditLog({
            action: "workflow.run.approval_rejected",
            actor: "workflow-run-processor",
            resource_type: "workflow_run",
            resource_id: run.id,
            details: {
              customer_id: run.customer_id,
              instance_id: run.instance_id,
              workflow_id: run.workflow_id,
              approval_gate: approvalGateMetadata,
              request_trace_id: requestTraceId,
            },
          });

          return totals;
        }

        if (!approvalGate.readyToDispatch) {
          const { data: waitingRow, error: waitingUpdateError } = await admin
            .from("workflow_runs")
            .update({
              status: "awaiting_approval" as WorkflowRunStatus,
              metadata: {
                ...runMetadata,
                runtime_state: "awaiting_approval",
                approval_gate: approvalGateMetadata,
                approval_waiting_at: nowIso,
                dispatch_processed_at: nowIso,
              },
            })
            .eq("id", run.id)
            .eq("status", "queued")
            .select("id")
            .maybeSingle();

          if (waitingUpdateError || !waitingRow) {
            totals.skipped += 1;
            return totals;
          }

          totals.approvalBlocked += 1;

          auditLog({
            action: "workflow.run.awaiting_approval",
            actor: "workflow-run-processor",
            resource_type: "workflow_run",
            resource_id: run.id,
            details: {
              customer_id: run.customer_id,
              instance_id: run.instance_id,
              workflow_id: run.workflow_id,
              approval_gate: approvalGateMetadata,
              request_trace_id: requestTraceId,
            },
          });

          return totals;
        }
      }

      // Validate instance exists
      if (!instanceIdSet.has(run.instance_id)) {
        await admin
          .from("workflow_runs")
          .update({
            status: "failed" as WorkflowRunStatus,
            error_message:
              "Instance metadata not found for workflow runtime dispatch.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "dispatch_instance_missing",
              runtime_error:
                "Instance metadata not found for workflow runtime dispatch.",
              dispatch_processed_at: nowIso,
            },
          })
          .eq("id", run.id)
          .eq("instance_id", run.instance_id);

        await admin
          .from("workflow_run_steps")
          .update({
            status: "failed",
            error_message:
              "Instance metadata not found for workflow runtime dispatch.",
            completed_at: nowIso,
          })
          .eq("run_id", run.id)
          .eq("instance_id", run.instance_id)
          .in("status", ["pending", "running"]);

        totals.failed += 1;
        return totals;
      }

      // Mark as running and dispatch
      const runtimeCorrelationId = run.runtime_correlation_id || run.id;

      const { data: dispatchedRow, error: dispatchError } = await admin
        .from("workflow_runs")
        .update({
          status: "running" as WorkflowRunStatus,
          started_at: nowIso,
          runtime_correlation_id: runtimeCorrelationId,
          metadata: {
            ...runMetadata,
            runtime_state: "dispatched",
            dispatch_processed_at: nowIso,
            dispatch_processor: "trigger/process-workflow-schedules",
            dispatch_mode: "trigger_dev",
          },
        })
        .eq("id", run.id)
        .eq("status", "queued")
        .select("id")
        .maybeSingle();

      if (dispatchError || !dispatchedRow) {
        totals.skipped += 1;
        return totals;
      }

      await admin
        .from("workflow_run_steps")
        .update({
          status: "running",
          started_at: nowIso,
        })
        .eq("run_id", run.id)
        .eq("instance_id", run.instance_id)
        .eq("status", "pending")
        .eq("step_index", 0);

      totals.dispatched += 1;
      dispatchedRunIds.push(run.id);

      // Invoke the dispatch callback (Trigger.dev task trigger)
      await options.onDispatch(run, runtimeCorrelationId);

      auditLog({
        action: "workflow.run.dispatched",
        actor: "workflow-run-processor",
        resource_type: "workflow_run",
        resource_id: run.id,
        details: {
          customer_id: run.customer_id,
          instance_id: run.instance_id,
          workflow_id: run.workflow_id,
          source_version: run.source_version,
          request_trace_id: requestTraceId,
        },
      });

      return totals;
    } catch (error) {
      totals.skipped += 1;

      auditLog({
        action: "workflow.run.dispatch_error",
        actor: "workflow-run-processor",
        resource_type: "workflow_run",
        resource_id: run.id,
        details: {
          customer_id: run.customer_id,
          instance_id: run.instance_id,
          workflow_id: run.workflow_id,
          error_message: errorToMessage(error),
          request_trace_id: requestTraceId,
        },
      });

      return totals;
    }
  };

  // Process in batches of RUN_PROCESS_CONCURRENCY
  const aggregateTotals = createEmptyTotals();

  for (
    let index = 0;
    index < queuedRuns.length;
    index += RUN_PROCESS_CONCURRENCY
  ) {
    const batch = queuedRuns.slice(index, index + RUN_PROCESS_CONCURRENCY);
    const settledBatch = await Promise.allSettled(
      batch.map((run) => processQueuedRun(run))
    );

    for (const result of settledBatch) {
      const rowTotals =
        result.status === "fulfilled"
          ? result.value
          : { ...createEmptyTotals(), skipped: 1 };

      aggregateTotals.dispatched += rowTotals.dispatched;
      aggregateTotals.failed += rowTotals.failed;
      aggregateTotals.skipped += rowTotals.skipped;
      aggregateTotals.approvalBlocked += rowTotals.approvalBlocked;
      aggregateTotals.approvalRejected += rowTotals.approvalRejected;
    }
  }

  return {
    claimed: queuedRuns.length,
    dispatched: aggregateTotals.dispatched,
    failed: aggregateTotals.failed,
    skipped: aggregateTotals.skipped,
    approval_blocked: aggregateTotals.approvalBlocked,
    approval_rejected: aggregateTotals.approvalRejected,
    dispatched_run_ids: dispatchedRunIds,
  };
}
