import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  getWorkflowApproval,
  listWorkflowApprovalsForRun,
} from "@/lib/queries/workflow-approvals";
import {
  buildWorkflowApprovalInsertRows,
  evaluateWorkflowRunApprovalGate,
  extractRequiredApprovalNodeIds,
  resolveWorkflowApprovalNodes,
} from "@/lib/workflows/approvals";
import {
  WORKFLOW_RUN_STATUSES,
  type WorkflowApproval,
  type WorkflowRunStatus,
} from "@/types/workflow";

const WORKFLOW_RUN_STATUS_VALUES = new Set<WorkflowRunStatus>(
  WORKFLOW_RUN_STATUSES
);

const MUTABLE_APPROVAL_RUN_STATUSES = new Set<WorkflowRunStatus>([
  "queued",
  "awaiting_approval",
]);

interface WorkflowRunApprovalRow {
  id: string;
  workflow_id: string;
  source_version: number;
  status: string;
  metadata: unknown;
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readBoolean(value: unknown): boolean | null {
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

function normalizeRunStatus(value: string): WorkflowRunStatus {
  if (WORKFLOW_RUN_STATUS_VALUES.has(value as WorkflowRunStatus)) {
    return value as WorkflowRunStatus;
  }

  return "queued";
}

export class WorkflowApprovalDecisionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "WorkflowApprovalDecisionError";
  }
}

export interface ApplyWorkflowApprovalDecisionInput {
  admin: SupabaseClient;
  instanceId: string;
  customerId: string;
  approvalId: string;
  actorUserId: string;
  decision: "approved" | "rejected";
  comment?: string;
}

export interface ApplyWorkflowApprovalDecisionResult {
  approval: WorkflowApproval;
  runId: string;
  workflowId: string;
  runStatus: WorkflowRunStatus;
  gate: {
    required: number;
    missing: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export async function applyWorkflowApprovalDecision(
  input: ApplyWorkflowApprovalDecisionInput
): Promise<ApplyWorkflowApprovalDecisionResult> {
  const { admin, instanceId, customerId, approvalId, actorUserId, decision, comment } =
    input;
  const nowIso = new Date().toISOString();

  const approval = await getWorkflowApproval(admin, instanceId, customerId, approvalId);

  if (!approval) {
    throw new WorkflowApprovalDecisionError(404, "Workflow approval not found");
  }

  if (approval.status === "pending" && approval.sla_due_at) {
    const dueAtMs = Date.parse(approval.sla_due_at);
    const nowMs = Date.parse(nowIso);
    if (!Number.isNaN(dueAtMs) && !Number.isNaN(nowMs) && dueAtMs < nowMs) {
      const { error: expireError } = await admin
        .from("workflow_approvals")
        .update({
          status: "expired",
          expired_at: nowIso,
          decided_at: nowIso,
          decision_comment: approval.decision_comment || "Approval SLA expired.",
        })
        .eq("id", approval.id)
        .eq("instance_id", instanceId)
        .eq("customer_id", customerId)
        .eq("status", "pending");

      if (expireError) {
        throw new Error(
          safeErrorMessage(expireError, "Failed to expire workflow approval")
        );
      }

      throw new WorkflowApprovalDecisionError(
        409,
        "Approval SLA expired and can no longer be decided."
      );
    }
  }

  if (approval.status !== "pending") {
    throw new WorkflowApprovalDecisionError(
      409,
      "Approval is already decided and cannot be changed."
    );
  }

  const commentText = comment?.trim();
  const requireRejectComment =
    readBoolean(approval.metadata.require_comment_on_reject) === true;
  if (decision === "rejected" && requireRejectComment && !commentText) {
    throw new WorkflowApprovalDecisionError(
      400,
      "A comment is required before rejecting this approval."
    );
  }

  const { data: runData, error: runError } = await admin
    .from("workflow_runs")
    .select("id, workflow_id, source_version, status, metadata")
    .eq("id", approval.run_id)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (runError) {
    throw new Error(
      safeErrorMessage(runError, "Failed to load workflow run for approval")
    );
  }

  if (!runData) {
    throw new WorkflowApprovalDecisionError(404, "Workflow run not found");
  }

  const run = runData as WorkflowRunApprovalRow;
  const runStatus = normalizeRunStatus(run.status);

  if (!MUTABLE_APPROVAL_RUN_STATUSES.has(runStatus)) {
    throw new WorkflowApprovalDecisionError(
      409,
      "Workflow run is no longer waiting for approval."
    );
  }

  const decisionFields: Record<string, unknown> = {
    status: decision,
    decision_comment: commentText || null,
    decision_actor_id: actorUserId,
    decided_at: nowIso,
  };

  if (decision === "approved") {
    decisionFields.approved_at = nowIso;
    decisionFields.rejected_at = null;
    decisionFields.canceled_at = null;
    decisionFields.expired_at = null;
  } else {
    decisionFields.rejected_at = nowIso;
  }

  const { data: updatedApprovalMarker, error: updateApprovalError } = await admin
    .from("workflow_approvals")
    .update(decisionFields)
    .eq("id", approval.id)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateApprovalError) {
    throw new Error(
      safeErrorMessage(updateApprovalError, "Failed to update workflow approval")
    );
  }

  if (!updatedApprovalMarker) {
    throw new WorkflowApprovalDecisionError(
      409,
      "Approval has already been decided by another actor."
    );
  }

  const { data: versionData, error: versionError } = await admin
    .from("workflow_versions")
    .select("graph")
    .eq("workflow_id", run.workflow_id)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .eq("version", run.source_version)
    .maybeSingle();

  if (versionError) {
    throw new Error(
      safeErrorMessage(versionError, "Failed to load workflow version for approval")
    );
  }

  if (!versionData) {
    throw new WorkflowApprovalDecisionError(
      409,
      "Workflow snapshot not found for approval evaluation."
    );
  }

  const approvalNodes = resolveWorkflowApprovalNodes(versionData.graph, new Date(nowIso));
  const requiredNodeIds = extractRequiredApprovalNodeIds(approvalNodes);

  let runApprovals = await listWorkflowApprovalsForRun(
    admin,
    instanceId,
    customerId,
    run.id
  );
  let gate = evaluateWorkflowRunApprovalGate(requiredNodeIds, runApprovals);

  if (gate.missingNodeIds.length > 0) {
    const missingNodes = approvalNodes.filter((node) =>
      gate.missingNodeIds.includes(node.node_id)
    );

    if (missingNodes.length > 0) {
      const { error: insertMissingError } = await admin
        .from("workflow_approvals")
        .upsert(
          buildWorkflowApprovalInsertRows({
            runId: run.id,
            workflowId: run.workflow_id,
            instanceId,
            customerId,
            approvalNodes: missingNodes,
            source: "processor_backfill",
          }),
          {
            onConflict: "run_id,node_id",
            ignoreDuplicates: true,
          }
        );

      if (insertMissingError) {
        throw new Error(
          safeErrorMessage(
            insertMissingError,
            "Failed to backfill missing workflow approvals"
          )
        );
      }

      runApprovals = await listWorkflowApprovalsForRun(
        admin,
        instanceId,
        customerId,
        run.id
      );
      gate = evaluateWorkflowRunApprovalGate(requiredNodeIds, runApprovals);
    }
  }

  const baseMetadata = normalizeObject(run.metadata);
  const gateMetadata = {
    required: requiredNodeIds.length,
    missing: gate.missingNodeIds.length,
    pending: gate.pendingNodeIds.length,
    approved: gate.approvedNodeIds.length,
    rejected: gate.rejectedNodeIds.length,
    checked_at: nowIso,
  };

  const runUpdates: Record<string, unknown> = {
    metadata: {
      ...baseMetadata,
      approval_gate: gateMetadata,
    },
  };

  let nextRunStatus: WorkflowRunStatus = "awaiting_approval";

  if (gate.hasTerminalRejection) {
    nextRunStatus = "approval_rejected";
    runUpdates.status = nextRunStatus;
    runUpdates.completed_at = nowIso;
    runUpdates.error_message = "Workflow run rejected during approval.";
    runUpdates.metadata = {
      ...baseMetadata,
      runtime_state: "approval_rejected",
      approval_gate: gateMetadata,
      approval_rejected_at: nowIso,
    };

    await admin
      .from("workflow_run_steps")
      .update({
        status: "canceled",
        completed_at: nowIso,
        error_message: "Workflow run rejected during approval.",
      })
      .eq("run_id", run.id)
      .eq("instance_id", instanceId)
      .in("status", ["pending", "running"]);
  } else if (gate.readyToDispatch) {
    nextRunStatus = "queued";
    runUpdates.status = nextRunStatus;
    runUpdates.error_message = null;
    runUpdates.completed_at = null;
    runUpdates.canceled_at = null;
    runUpdates.metadata = {
      ...baseMetadata,
      runtime_state: "pending_runtime_bridge",
      approval_gate: gateMetadata,
      approval_ready_at: nowIso,
    };
  } else {
    nextRunStatus = "awaiting_approval";
    runUpdates.status = nextRunStatus;
    runUpdates.metadata = {
      ...baseMetadata,
      runtime_state: "awaiting_approval",
      approval_gate: gateMetadata,
      approval_waiting_at: nowIso,
    };
  }

  const { data: updatedRunMarker, error: updateRunError } = await admin
    .from("workflow_runs")
    .update(runUpdates)
    .eq("id", run.id)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .in("status", ["queued", "awaiting_approval"])
    .select("status")
    .maybeSingle();

  if (updateRunError) {
    throw new Error(
      safeErrorMessage(updateRunError, "Failed to update workflow run approval state")
    );
  }

  if (updatedRunMarker) {
    nextRunStatus = normalizeRunStatus(updatedRunMarker.status);
  } else {
    const { data: latestRunStatusRow, error: latestRunStatusError } = await admin
      .from("workflow_runs")
      .select("status")
      .eq("id", run.id)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (latestRunStatusError) {
      throw new Error(
        safeErrorMessage(
          latestRunStatusError,
          "Failed to load latest workflow run status"
        )
      );
    }

    if (latestRunStatusRow?.status) {
      nextRunStatus = normalizeRunStatus(latestRunStatusRow.status);
    }
  }

  const updatedApproval = await getWorkflowApproval(
    admin,
    instanceId,
    customerId,
    approval.id
  );

  if (!updatedApproval) {
    throw new WorkflowApprovalDecisionError(
      404,
      "Workflow approval not found after update"
    );
  }

  return {
    approval: updatedApproval,
    runId: run.id,
    workflowId: run.workflow_id,
    runStatus: nextRunStatus,
    gate: {
      required: requiredNodeIds.length,
      missing: gate.missingNodeIds.length,
      pending: gate.pendingNodeIds.length,
      approved: gate.approvedNodeIds.length,
      rejected: gate.rejectedNodeIds.length,
    },
  };
}
