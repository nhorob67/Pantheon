import type {
  WorkflowApproval,
  WorkflowApprovalStatus,
} from "@/types/workflow";

interface WorkflowNodeLike {
  id: unknown;
  type: unknown;
  label?: unknown;
  config?: unknown;
}

export interface WorkflowApprovalNode {
  node_id: string;
  node_label: string | null;
  sla_due_at: string | null;
  metadata: Record<string, unknown>;
}

type WorkflowApprovalLike = Pick<WorkflowApproval, "node_id" | "status">;

const TERMINAL_REJECTION_STATUSES = new Set<WorkflowApprovalStatus>([
  "rejected",
  "canceled",
  "expired",
]);

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function parsePositiveNumber(value: unknown): number | null {
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

function resolveSlaDueAt(config: Record<string, unknown>, now: Date): string | null {
  const explicitDueAt = config.sla_due_at;
  if (typeof explicitDueAt === "string") {
    const parsed = new Date(explicitDueAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const fieldMultipliers: Array<{ key: string; multiplierMs: number }> = [
    { key: "sla_seconds", multiplierMs: 1000 },
    { key: "sla_minutes", multiplierMs: 60 * 1000 },
    { key: "sla_hours", multiplierMs: 60 * 60 * 1000 },
    { key: "due_in_seconds", multiplierMs: 1000 },
    { key: "due_in_minutes", multiplierMs: 60 * 1000 },
    { key: "due_in_hours", multiplierMs: 60 * 60 * 1000 },
    { key: "timeout_seconds", multiplierMs: 1000 },
    { key: "timeout_minutes", multiplierMs: 60 * 1000 },
    { key: "timeout_hours", multiplierMs: 60 * 60 * 1000 },
  ];

  for (const field of fieldMultipliers) {
    const parsed = parsePositiveNumber(config[field.key]);
    if (parsed !== null) {
      return new Date(now.getTime() + parsed * field.multiplierMs).toISOString();
    }
  }

  return null;
}

export function resolveWorkflowApprovalNodes(
  graph: unknown,
  now: Date = new Date()
): WorkflowApprovalNode[] {
  if (!graph || typeof graph !== "object") {
    return [];
  }

  const nodes = (graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return [];
  }

  const approvalsById = new Map<string, WorkflowApprovalNode>();

  for (const rawNode of nodes) {
    if (!rawNode || typeof rawNode !== "object") {
      continue;
    }

    const node = rawNode as WorkflowNodeLike;
    if (node.type !== "approval" || typeof node.id !== "string") {
      continue;
    }

    const nodeId = node.id.trim();
    if (nodeId.length === 0 || approvalsById.has(nodeId)) {
      continue;
    }

    const config = normalizeObject(node.config);
    const reviewerGroup =
      readString(config.reviewer_group) || readString(config.reviewerGroup);
    const reviewerRole =
      readString(config.reviewer_role) || readString(config.reviewerRole);
    const instructions =
      readString(config.instructions) ||
      readString(config.approval_instructions) ||
      readString(config.approvalInstructions);
    const requireCommentOnReject =
      readBoolean(config.require_comment_on_reject) ??
      readBoolean(config.requireCommentOnReject);
    const slaMinutes =
      parsePositiveNumber(config.sla_minutes) ??
      parsePositiveNumber(config.slaMinutes);

    const metadata: Record<string, unknown> = {};
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
      node_label:
        typeof node.label === "string" && node.label.trim().length > 0
          ? node.label
          : null,
      sla_due_at: resolveSlaDueAt(config, now),
      metadata,
    });
  }

  return Array.from(approvalsById.values()).sort((a, b) =>
    a.node_id.localeCompare(b.node_id)
  );
}

export function extractRequiredApprovalNodeIds(
  approvalNodes: WorkflowApprovalNode[]
): string[] {
  return approvalNodes.map((node) => node.node_id);
}

export function buildWorkflowApprovalInsertRows(input: {
  runId: string;
  workflowId: string;
  instanceId: string;
  customerId: string;
  approvalNodes: WorkflowApprovalNode[];
  source: "run_request" | "retry_step" | "processor_backfill";
}): Array<Record<string, unknown>> {
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
      created_from: input.source,
    },
  }));
}

function rankApprovalStatus(status: WorkflowApprovalStatus): number {
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

export interface WorkflowApprovalGateState {
  requiresApproval: boolean;
  readyToDispatch: boolean;
  hasTerminalRejection: boolean;
  missingNodeIds: string[];
  pendingNodeIds: string[];
  approvedNodeIds: string[];
  rejectedNodeIds: string[];
}

export function evaluateWorkflowRunApprovalGate(
  requiredNodeIds: string[],
  approvals: WorkflowApprovalLike[]
): WorkflowApprovalGateState {
  const uniqueRequiredNodeIds = Array.from(new Set(requiredNodeIds)).sort((a, b) =>
    a.localeCompare(b)
  );

  if (uniqueRequiredNodeIds.length === 0) {
    return {
      requiresApproval: false,
      readyToDispatch: true,
      hasTerminalRejection: false,
      missingNodeIds: [],
      pendingNodeIds: [],
      approvedNodeIds: [],
      rejectedNodeIds: [],
    };
  }

  const requiredSet = new Set(uniqueRequiredNodeIds);
  const nodeStatusById = new Map<string, WorkflowApprovalStatus>();

  for (const approval of approvals) {
    if (!requiredSet.has(approval.node_id)) {
      continue;
    }

    const existing = nodeStatusById.get(approval.node_id);
    if (!existing || rankApprovalStatus(approval.status) > rankApprovalStatus(existing)) {
      nodeStatusById.set(approval.node_id, approval.status);
    }
  }

  const missingNodeIds: string[] = [];
  const pendingNodeIds: string[] = [];
  const approvedNodeIds: string[] = [];
  const rejectedNodeIds: string[] = [];

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
  const readyToDispatch =
    !hasTerminalRejection &&
    missingNodeIds.length === 0 &&
    pendingNodeIds.length === 0;

  return {
    requiresApproval: true,
    readyToDispatch,
    hasTerminalRejection,
    missingNodeIds,
    pendingNodeIds,
    approvedNodeIds,
    rejectedNodeIds,
  };
}
