import {
  buildScheduledRunCorrelationId,
  floorDateToUtcMinute,
  isCronDueAt,
  processRuntimeRun,
  resolveScheduledTrigger
} from "../../../../chunk-IKFPJALX.mjs";
import "../../../../chunk-5R2YARHQ.mjs";
import "../../../../chunk-6FHKRVG7.mjs";
import "../../../../chunk-YHJ4RCX5.mjs";
import "../../../../chunk-5C7EBN2F.mjs";
import "../../../../chunk-FNDDZUO5.mjs";
import {
  auditLog
} from "../../../../chunk-XF5T4F7Q.mjs";
import {
  safeErrorMessage
} from "../../../../chunk-R2V4UDE3.mjs";
import "../../../../chunk-XSF42NVM.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/process-workflow-schedules.ts
init_esm();

// src/lib/workflows/run-processor.ts
init_esm();

// src/lib/workflows/approvals.ts
init_esm();
var TERMINAL_REJECTION_STATUSES = /* @__PURE__ */ new Set([
  "rejected",
  "canceled",
  "expired"
]);
function normalizeObject(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  return {};
}
__name(normalizeObject, "normalizeObject");
function readString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
__name(readString, "readString");
function readBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return null;
}
__name(readBoolean, "readBoolean");
function parsePositiveNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}
__name(parsePositiveNumber, "parsePositiveNumber");
function resolveSlaDueAt(config, now) {
  const explicitDueAt = config.sla_due_at;
  if (typeof explicitDueAt === "string") {
    const parsed = new Date(explicitDueAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  const fieldMultipliers = [
    { key: "sla_seconds", multiplierMs: 1e3 },
    { key: "sla_minutes", multiplierMs: 60 * 1e3 },
    { key: "sla_hours", multiplierMs: 60 * 60 * 1e3 },
    { key: "due_in_seconds", multiplierMs: 1e3 },
    { key: "due_in_minutes", multiplierMs: 60 * 1e3 },
    { key: "due_in_hours", multiplierMs: 60 * 60 * 1e3 },
    { key: "timeout_seconds", multiplierMs: 1e3 },
    { key: "timeout_minutes", multiplierMs: 60 * 1e3 },
    { key: "timeout_hours", multiplierMs: 60 * 60 * 1e3 }
  ];
  for (const field of fieldMultipliers) {
    const parsed = parsePositiveNumber(config[field.key]);
    if (parsed !== null) {
      return new Date(now.getTime() + parsed * field.multiplierMs).toISOString();
    }
  }
  return null;
}
__name(resolveSlaDueAt, "resolveSlaDueAt");
function resolveWorkflowApprovalNodes(graph, now = /* @__PURE__ */ new Date()) {
  if (!graph || typeof graph !== "object") {
    return [];
  }
  const nodes = graph.nodes;
  if (!Array.isArray(nodes)) {
    return [];
  }
  const approvalsById = /* @__PURE__ */ new Map();
  for (const rawNode of nodes) {
    if (!rawNode || typeof rawNode !== "object") {
      continue;
    }
    const node = rawNode;
    if (node.type !== "approval" || typeof node.id !== "string") {
      continue;
    }
    const nodeId = node.id.trim();
    if (nodeId.length === 0 || approvalsById.has(nodeId)) {
      continue;
    }
    const config = normalizeObject(node.config);
    const reviewerGroup = readString(config.reviewer_group) || readString(config.reviewerGroup);
    const reviewerRole = readString(config.reviewer_role) || readString(config.reviewerRole);
    const instructions = readString(config.instructions) || readString(config.approval_instructions) || readString(config.approvalInstructions);
    const requireCommentOnReject = readBoolean(config.require_comment_on_reject) ?? readBoolean(config.requireCommentOnReject);
    const slaMinutes = parsePositiveNumber(config.sla_minutes) ?? parsePositiveNumber(config.slaMinutes);
    const metadata = {};
    if (reviewerGroup) {
      metadata.reviewer_group = reviewerGroup;
    }
    if (reviewerRole) {
      metadata.reviewer_role = reviewerRole;
    }
    if (instructions) {
      metadata.instructions = instructions;
    }
    if (slaMinutes !== null) {
      metadata.sla_minutes = Math.trunc(slaMinutes);
    }
    if (requireCommentOnReject !== null) {
      metadata.require_comment_on_reject = requireCommentOnReject;
    }
    approvalsById.set(nodeId, {
      node_id: nodeId,
      node_label: typeof node.label === "string" && node.label.trim().length > 0 ? node.label : null,
      sla_due_at: resolveSlaDueAt(config, now),
      metadata
    });
  }
  return Array.from(approvalsById.values()).sort(
    (a, b) => a.node_id.localeCompare(b.node_id)
  );
}
__name(resolveWorkflowApprovalNodes, "resolveWorkflowApprovalNodes");
function extractRequiredApprovalNodeIds(approvalNodes) {
  return approvalNodes.map((node) => node.node_id);
}
__name(extractRequiredApprovalNodeIds, "extractRequiredApprovalNodeIds");
function buildWorkflowApprovalInsertRows(input) {
  return input.approvalNodes.map((node) => ({
    run_id: input.runId,
    workflow_id: input.workflowId,
    instance_id: input.instanceId,
    customer_id: input.customerId,
    node_id: node.node_id,
    node_label: node.node_label,
    status: "pending",
    sla_due_at: node.sla_due_at,
    metadata: {
      ...node.metadata,
      created_from: input.source
    }
  }));
}
__name(buildWorkflowApprovalInsertRows, "buildWorkflowApprovalInsertRows");
function rankApprovalStatus(status) {
  if (TERMINAL_REJECTION_STATUSES.has(status)) {
    return 3;
  }
  if (status === "pending") {
    return 2;
  }
  if (status === "approved") {
    return 1;
  }
  return 0;
}
__name(rankApprovalStatus, "rankApprovalStatus");
function evaluateWorkflowRunApprovalGate(requiredNodeIds, approvals) {
  const uniqueRequiredNodeIds = Array.from(new Set(requiredNodeIds)).sort(
    (a, b) => a.localeCompare(b)
  );
  if (uniqueRequiredNodeIds.length === 0) {
    return {
      requiresApproval: false,
      readyToDispatch: true,
      hasTerminalRejection: false,
      missingNodeIds: [],
      pendingNodeIds: [],
      approvedNodeIds: [],
      rejectedNodeIds: []
    };
  }
  const requiredSet = new Set(uniqueRequiredNodeIds);
  const nodeStatusById = /* @__PURE__ */ new Map();
  for (const approval of approvals) {
    if (!requiredSet.has(approval.node_id)) {
      continue;
    }
    const existing = nodeStatusById.get(approval.node_id);
    if (!existing || rankApprovalStatus(approval.status) > rankApprovalStatus(existing)) {
      nodeStatusById.set(approval.node_id, approval.status);
    }
  }
  const missingNodeIds = [];
  const pendingNodeIds = [];
  const approvedNodeIds = [];
  const rejectedNodeIds = [];
  for (const nodeId of uniqueRequiredNodeIds) {
    const status = nodeStatusById.get(nodeId);
    if (!status) {
      missingNodeIds.push(nodeId);
      continue;
    }
    if (status === "approved") {
      approvedNodeIds.push(nodeId);
      continue;
    }
    if (TERMINAL_REJECTION_STATUSES.has(status)) {
      rejectedNodeIds.push(nodeId);
      continue;
    }
    pendingNodeIds.push(nodeId);
  }
  const hasTerminalRejection = rejectedNodeIds.length > 0;
  const readyToDispatch = !hasTerminalRejection && missingNodeIds.length === 0 && pendingNodeIds.length === 0;
  return {
    requiresApproval: true,
    readyToDispatch,
    hasTerminalRejection,
    missingNodeIds,
    pendingNodeIds,
    approvedNodeIds,
    rejectedNodeIds
  };
}
__name(evaluateWorkflowRunApprovalGate, "evaluateWorkflowRunApprovalGate");

// src/types/workflow.ts
init_esm();
var WORKFLOW_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "canceled",
  "expired"
];

// src/lib/workflows/run-processor.ts
var DEFAULT_BATCH_SIZE = 20;
var MAX_BATCH_SIZE = 100;
var RUN_PROCESS_CONCURRENCY = 5;
var MAX_ERROR_LENGTH = 2e3;
var WORKFLOW_APPROVAL_STATUS_VALUES = new Set(
  WORKFLOW_APPROVAL_STATUSES
);
function normalizeObject2(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  return {};
}
__name(normalizeObject2, "normalizeObject");
function errorToMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}
__name(errorToMessage, "errorToMessage");
function normalizeApprovalStatus(value) {
  if (typeof value === "string" && WORKFLOW_APPROVAL_STATUS_VALUES.has(value)) {
    return value;
  }
  return "pending";
}
__name(normalizeApprovalStatus, "normalizeApprovalStatus");
function createEmptyTotals() {
  return {
    dispatched: 0,
    failed: 0,
    skipped: 0,
    approvalBlocked: 0,
    approvalRejected: 0
  };
}
__name(createEmptyTotals, "createEmptyTotals");
async function processQueuedWorkflowRuns(admin, options) {
  const batchSize = Math.min(
    Math.max(options.batchSize ?? DEFAULT_BATCH_SIZE, 1),
    MAX_BATCH_SIZE
  );
  const requestTraceId = options.requestTraceId ?? crypto.randomUUID();
  const { data: queuedData, error: queuedError } = await admin.from("workflow_runs").select(
    "id, workflow_id, instance_id, customer_id, source_version, runtime_correlation_id, input_payload, metadata"
  ).eq("status", "queued").order("created_at", { ascending: true }).limit(batchSize);
  if (queuedError) {
    throw new Error(
      safeErrorMessage(queuedError, "Failed to load queued workflow runs")
    );
  }
  const queuedRuns = queuedData || [];
  if (queuedRuns.length === 0) {
    return {
      claimed: 0,
      dispatched: 0,
      failed: 0,
      skipped: 0,
      approval_blocked: 0,
      approval_rejected: 0,
      dispatched_run_ids: []
    };
  }
  const workflowIds = Array.from(
    new Set(queuedRuns.map((run) => run.workflow_id))
  );
  const sourceVersions = Array.from(
    new Set(
      queuedRuns.map((run) => run.source_version).filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  const runIds = queuedRuns.map((run) => run.id);
  const instanceIds = Array.from(
    new Set(queuedRuns.map((run) => run.instance_id))
  );
  const [
    { data: workflowStatesData, error: workflowStatesError },
    { data: workflowVersionData, error: workflowVersionError },
    { data: instanceRows, error: instanceError }
  ] = await Promise.all([
    admin.from("workflow_definitions").select("id, status, published_version").in("id", workflowIds),
    sourceVersions.length > 0 ? admin.from("workflow_versions").select("workflow_id, version, graph").in("workflow_id", workflowIds).in("version", sourceVersions) : Promise.resolve({ data: [], error: null }),
    admin.from("instances").select("id").in("id", instanceIds)
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
  const workflowStateById = new Map(
    (workflowStatesData || []).map(
      (workflow) => [workflow.id, workflow]
    )
  );
  const workflowVersionByKey = new Map(
    (workflowVersionData || []).map((row) => [
      `${row.workflow_id}:${row.version}`,
      row
    ])
  );
  const instanceIdSet = new Set(
    (instanceRows || []).map((row) => row.id)
  );
  const approvalCheckNowIso = (/* @__PURE__ */ new Date()).toISOString();
  await admin.from("workflow_approvals").update({
    status: "expired",
    expired_at: approvalCheckNowIso,
    decided_at: approvalCheckNowIso,
    decision_comment: "Approval SLA expired."
  }).in("run_id", runIds).eq("status", "pending").lt("sla_due_at", approvalCheckNowIso);
  const { data: approvalRowsData, error: approvalRowsError } = await admin.from("workflow_approvals").select("id, run_id, node_id, status").in("run_id", runIds);
  if (approvalRowsError) {
    throw new Error(
      safeErrorMessage(
        approvalRowsError,
        "Failed to load workflow approvals for queued runs"
      )
    );
  }
  const approvalsByRunId = /* @__PURE__ */ new Map();
  for (const row of approvalRowsData || []) {
    const current = approvalsByRunId.get(row.run_id) || [];
    current.push({
      node_id: row.node_id,
      status: normalizeApprovalStatus(row.status)
    });
    approvalsByRunId.set(row.run_id, current);
  }
  const dispatchedRunIds = [];
  const processQueuedRun = /* @__PURE__ */ __name(async (run) => {
    const totals = createEmptyTotals();
    const workflowState = workflowStateById.get(run.workflow_id);
    const workflowVersion = workflowVersionByKey.get(
      `${run.workflow_id}:${run.source_version}`
    );
    const runMetadata = {
      ...normalizeObject2(run.metadata),
      request_trace_id: requestTraceId
    };
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    try {
      if (!workflowState || workflowState.status !== "published" || !workflowState.published_version || workflowState.published_version < run.source_version) {
        const { data: failedRow, error: failUpdateError } = await admin.from("workflow_runs").update({
          status: "failed",
          error_message: "Workflow is no longer runnable in its queued version. Re-publish and retry.",
          completed_at: nowIso,
          metadata: {
            ...runMetadata,
            runtime_state: "dispatch_rejected",
            dispatch_error: "workflow_not_runnable",
            dispatch_processed_at: nowIso
          }
        }).eq("id", run.id).eq("status", "queued").select("id").maybeSingle();
        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }
        totals.failed += 1;
        return totals;
      }
      if (!workflowVersion) {
        const { data: failedRow, error: failUpdateError } = await admin.from("workflow_runs").update({
          status: "failed",
          error_message: "Workflow snapshot for queued run was not found. Re-publish and retry.",
          completed_at: nowIso,
          metadata: {
            ...runMetadata,
            runtime_state: "dispatch_rejected",
            dispatch_error: "workflow_snapshot_missing",
            dispatch_processed_at: nowIso
          }
        }).eq("id", run.id).eq("status", "queued").select("id").maybeSingle();
        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }
        totals.failed += 1;
        return totals;
      }
      const approvalNodes = resolveWorkflowApprovalNodes(
        workflowVersion.graph,
        new Date(nowIso)
      );
      const requiredApprovalNodeIds = extractRequiredApprovalNodeIds(approvalNodes);
      if (requiredApprovalNodeIds.length > 0) {
        let runApprovals = approvalsByRunId.get(run.id) || [];
        let approvalGate = evaluateWorkflowRunApprovalGate(
          requiredApprovalNodeIds,
          runApprovals
        );
        if (approvalGate.missingNodeIds.length > 0) {
          const missingNodes = approvalNodes.filter(
            (node) => approvalGate.missingNodeIds.includes(node.node_id)
          );
          if (missingNodes.length > 0) {
            const { error: missingApprovalInsertError } = await admin.from("workflow_approvals").upsert(
              buildWorkflowApprovalInsertRows({
                runId: run.id,
                workflowId: run.workflow_id,
                instanceId: run.instance_id,
                customerId: run.customer_id,
                approvalNodes: missingNodes,
                source: "processor_backfill"
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
                status: "pending"
              }))
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
          checked_at: nowIso
        };
        if (approvalGate.hasTerminalRejection) {
          const { data: rejectedRow, error: rejectUpdateError } = await admin.from("workflow_runs").update({
            status: "approval_rejected",
            error_message: "Workflow run rejected during approval.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "approval_rejected",
              approval_gate: approvalGateMetadata,
              approval_rejected_at: nowIso,
              dispatch_processed_at: nowIso
            }
          }).eq("id", run.id).eq("status", "queued").select("id").maybeSingle();
          if (rejectUpdateError || !rejectedRow) {
            totals.skipped += 1;
            return totals;
          }
          await admin.from("workflow_run_steps").update({
            status: "canceled",
            completed_at: nowIso,
            error_message: "Workflow run rejected during approval."
          }).eq("run_id", run.id).eq("instance_id", run.instance_id).in("status", ["pending", "running"]);
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
              request_trace_id: requestTraceId
            }
          });
          return totals;
        }
        if (!approvalGate.readyToDispatch) {
          const { data: waitingRow, error: waitingUpdateError } = await admin.from("workflow_runs").update({
            status: "awaiting_approval",
            metadata: {
              ...runMetadata,
              runtime_state: "awaiting_approval",
              approval_gate: approvalGateMetadata,
              approval_waiting_at: nowIso,
              dispatch_processed_at: nowIso
            }
          }).eq("id", run.id).eq("status", "queued").select("id").maybeSingle();
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
              request_trace_id: requestTraceId
            }
          });
          return totals;
        }
      }
      if (!instanceIdSet.has(run.instance_id)) {
        await admin.from("workflow_runs").update({
          status: "failed",
          error_message: "Instance metadata not found for workflow runtime dispatch.",
          completed_at: nowIso,
          metadata: {
            ...runMetadata,
            runtime_state: "dispatch_instance_missing",
            runtime_error: "Instance metadata not found for workflow runtime dispatch.",
            dispatch_processed_at: nowIso
          }
        }).eq("id", run.id).eq("instance_id", run.instance_id);
        await admin.from("workflow_run_steps").update({
          status: "failed",
          error_message: "Instance metadata not found for workflow runtime dispatch.",
          completed_at: nowIso
        }).eq("run_id", run.id).eq("instance_id", run.instance_id).in("status", ["pending", "running"]);
        totals.failed += 1;
        return totals;
      }
      const runtimeCorrelationId = run.runtime_correlation_id || run.id;
      const { data: dispatchedRow, error: dispatchError } = await admin.from("workflow_runs").update({
        status: "running",
        started_at: nowIso,
        runtime_correlation_id: runtimeCorrelationId,
        metadata: {
          ...runMetadata,
          runtime_state: "dispatched",
          dispatch_processed_at: nowIso,
          dispatch_processor: "trigger/process-workflow-schedules",
          dispatch_mode: "trigger_dev"
        }
      }).eq("id", run.id).eq("status", "queued").select("id").maybeSingle();
      if (dispatchError || !dispatchedRow) {
        totals.skipped += 1;
        return totals;
      }
      await admin.from("workflow_run_steps").update({
        status: "running",
        started_at: nowIso
      }).eq("run_id", run.id).eq("instance_id", run.instance_id).eq("status", "pending").eq("step_index", 0);
      totals.dispatched += 1;
      dispatchedRunIds.push(run.id);
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
          request_trace_id: requestTraceId
        }
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
          request_trace_id: requestTraceId
        }
      });
      return totals;
    }
  }, "processQueuedRun");
  const aggregateTotals = createEmptyTotals();
  for (let index = 0; index < queuedRuns.length; index += RUN_PROCESS_CONCURRENCY) {
    const batch = queuedRuns.slice(index, index + RUN_PROCESS_CONCURRENCY);
    const settledBatch = await Promise.allSettled(
      batch.map((run) => processQueuedRun(run))
    );
    for (const result of settledBatch) {
      const rowTotals = result.status === "fulfilled" ? result.value : { ...createEmptyTotals(), skipped: 1 };
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
    dispatched_run_ids: dispatchedRunIds
  };
}
__name(processQueuedWorkflowRuns, "processQueuedWorkflowRuns");

// src/trigger/process-workflow-schedules.ts
var MAX_ENQUEUE_LIMIT = 500;
var processWorkflowSchedules = schedules_exports.task({
  id: "process-workflow-schedules",
  cron: "*/1 * * * *",
  retry: {
    maxAttempts: 2
  },
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const evaluationDate = /* @__PURE__ */ new Date();
    const slotDate = floorDateToUtcMinute(evaluationDate);
    const slotUtc = slotDate.toISOString();
    const { data: definitionsData, error: definitionsError } = await admin.from("workflow_definitions").select("id, instance_id, customer_id, name, published_version").eq("status", "published").not("published_version", "is", null);
    if (definitionsError) {
      throw new Error(
        safeErrorMessage(
          definitionsError,
          "Failed to load published workflows for schedule processing"
        )
      );
    }
    const definitions = definitionsData || [];
    if (definitions.length === 0) {
      return {
        slot_utc: slotUtc,
        scanned: 0,
        due: 0,
        enqueued: 0,
        duplicate: 0,
        failed: 0
      };
    }
    const workflowIds = Array.from(new Set(definitions.map((row) => row.id)));
    const publishedVersions = Array.from(
      new Set(
        definitions.map((row) => Number(row.published_version)).filter((value) => Number.isInteger(value) && value > 0)
      )
    );
    if (publishedVersions.length === 0) {
      return {
        slot_utc: slotUtc,
        scanned: definitions.length,
        due: 0,
        enqueued: 0,
        duplicate: 0,
        failed: 0
      };
    }
    const { data: versionsData, error: versionsError } = await admin.from("workflow_versions").select("workflow_id, version, graph").in("workflow_id", workflowIds).in("version", publishedVersions);
    if (versionsError) {
      throw new Error(
        safeErrorMessage(
          versionsError,
          "Failed to load published workflow snapshots for schedule processing"
        )
      );
    }
    const versionsByKey = new Map(
      (versionsData || []).map((row) => [
        `${row.workflow_id}:${row.version}`,
        row
      ])
    );
    const dueCandidates = [];
    let dueCount = 0;
    let skippedMissingSnapshot = 0;
    let skippedNonSchedule = 0;
    let skippedNotDue = 0;
    let skippedInvalidSchedule = 0;
    let skippedEnqueueLimit = 0;
    for (const workflow of definitions) {
      const sourceVersion = Number(workflow.published_version);
      if (!Number.isInteger(sourceVersion) || sourceVersion <= 0) {
        skippedMissingSnapshot += 1;
        continue;
      }
      const snapshot = versionsByKey.get(`${workflow.id}:${sourceVersion}`);
      if (!snapshot) {
        skippedMissingSnapshot += 1;
        continue;
      }
      const scheduleTrigger = resolveScheduledTrigger(snapshot.graph);
      if (!scheduleTrigger) {
        skippedNonSchedule += 1;
        continue;
      }
      const dueResult = isCronDueAt(
        scheduleTrigger.cron,
        scheduleTrigger.timezone,
        slotDate
      );
      if (dueResult.invalid) {
        skippedInvalidSchedule += 1;
        continue;
      }
      if (!dueResult.due) {
        skippedNotDue += 1;
        continue;
      }
      dueCount += 1;
      if (dueCandidates.length >= MAX_ENQUEUE_LIMIT) {
        skippedEnqueueLimit += 1;
        continue;
      }
      dueCandidates.push({
        workflow,
        source_version: sourceVersion,
        trigger_node_id: scheduleTrigger.trigger_node_id,
        cron: scheduleTrigger.cron,
        timezone: scheduleTrigger.timezone
      });
    }
    let enqueued = 0;
    let duplicate = 0;
    let failed = 0;
    let stepSeedFailed = 0;
    const errors = [];
    for (const candidate of dueCandidates) {
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const runtimeCorrelationId = buildScheduledRunCorrelationId(
        candidate.workflow.id,
        candidate.source_version,
        slotUtc
      );
      const { data: insertedRun, error: insertError } = await admin.from("workflow_runs").insert({
        workflow_id: candidate.workflow.id,
        instance_id: candidate.workflow.instance_id,
        customer_id: candidate.workflow.customer_id,
        trigger_type: "schedule",
        status: "queued",
        source_version: candidate.source_version,
        requested_by: null,
        runtime_correlation_id: runtimeCorrelationId,
        input_payload: {},
        metadata: {
          queued_at: nowIso,
          runtime_state: "pending_runtime_bridge",
          schedule: {
            cron: candidate.cron,
            timezone: candidate.timezone,
            slot_utc: slotUtc,
            enqueued_by: "trigger/process-workflow-schedules"
          }
        }
      }).select("id").single();
      if (insertError) {
        if (insertError.code === "23505") {
          duplicate += 1;
          continue;
        }
        failed += 1;
        errors.push({
          workflow_id: candidate.workflow.id,
          message: safeErrorMessage(insertError, "Failed to enqueue scheduled run")
        });
        continue;
      }
      if (!insertedRun?.id) {
        failed += 1;
        errors.push({
          workflow_id: candidate.workflow.id,
          message: "Scheduled run insert returned no row."
        });
        continue;
      }
      enqueued += 1;
      const { error: seedError } = await admin.from("workflow_run_steps").insert({
        run_id: insertedRun.id,
        workflow_id: candidate.workflow.id,
        instance_id: candidate.workflow.instance_id,
        customer_id: candidate.workflow.customer_id,
        node_id: candidate.trigger_node_id,
        node_type: "trigger",
        step_index: 0,
        attempt: 1,
        status: "pending",
        metadata: {
          seeded_from: "schedule_enqueuer",
          schedule_slot_utc: slotUtc
        }
      });
      if (seedError) {
        stepSeedFailed += 1;
      }
      auditLog({
        action: "workflow.run.scheduled",
        actor: "workflow-schedule-enqueuer",
        resource_type: "workflow_run",
        resource_id: insertedRun.id,
        details: {
          customer_id: candidate.workflow.customer_id,
          instance_id: candidate.workflow.instance_id,
          workflow_id: candidate.workflow.id,
          workflow_name: candidate.workflow.name,
          source_version: candidate.source_version,
          slot_utc: slotUtc
        }
      });
    }
    let queuedRunsResult = null;
    try {
      queuedRunsResult = await processQueuedWorkflowRuns(admin, {
        onDispatch: /* @__PURE__ */ __name(async (_run, runId) => {
          await processRuntimeRun.trigger({ runId });
        }, "onDispatch")
      });
    } catch (err) {
      console.error("[process-workflow-schedules] Queued runs processing failed:", err);
    }
    return {
      slot_utc: slotUtc,
      scanned: definitions.length,
      due: dueCount,
      enqueued,
      duplicate,
      failed,
      step_seed_failed: stepSeedFailed,
      skipped: {
        missing_snapshot: skippedMissingSnapshot,
        non_schedule: skippedNonSchedule,
        not_due: skippedNotDue,
        invalid_schedule: skippedInvalidSchedule,
        enqueue_limit: skippedEnqueueLimit
      },
      errors: errors.slice(0, 20),
      queued_runs: queuedRunsResult
    };
  }, "run")
});
export {
  processWorkflowSchedules
};
//# sourceMappingURL=process-workflow-schedules.mjs.map
