export const WORKFLOW_APPROVAL_FILTER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "canceled",
  "expired",
] as const;

const WORKFLOW_APPROVAL_TERMINAL_STATUSES = new Set<string>([
  "approved",
  "rejected",
  "canceled",
  "expired",
]);

export interface WorkflowApprovalRecord {
  id: string;
  instanceId: string;
  workflowId: string;
  runId: string | null;
  nodeId: string | null;
  nodeLabel: string | null;
  status: string;
  reviewerGroup: string | null;
  reviewerRole: string | null;
  instructions: string | null;
  slaMinutes: number | null;
  requestedAt: string | null;
  dueAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionComment: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
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

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }
  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function normalizeWorkflowApprovalRecord(
  input: unknown
): WorkflowApprovalRecord | null {
  const record = asRecord(input);
  const metadata = asRecord(record.metadata);
  const id = pickString(record, ["id", "approval_id"]);

  if (!id) {
    return null;
  }

  const requestedAt = pickString(record, ["requested_at", "created_at"]);
  const slaMinutes =
    readNumber(record.sla_minutes) ??
    readNumber(record.slaMinutes) ??
    readNumber(metadata.sla_minutes) ??
    readNumber(metadata.slaMinutes);

  let dueAt = pickString(record, [
    "sla_due_at",
    "due_at",
    "expires_at",
    "deadline_at",
  ]);
  if (!dueAt && requestedAt && slaMinutes !== null) {
    const requestedMs = Date.parse(requestedAt);
    if (!Number.isNaN(requestedMs)) {
      dueAt = new Date(requestedMs + slaMinutes * 60 * 1000).toISOString();
    }
  }

  return {
    id,
    instanceId:
      pickString(record, ["instance_id", "instanceId"]) ||
      pickString(metadata, ["instance_id", "instanceId"]) ||
      "",
    workflowId:
      pickString(record, ["workflow_id", "workflowId"]) ||
      pickString(metadata, ["workflow_id", "workflowId"]) ||
      "",
    runId: pickString(record, ["run_id", "runId"]),
    nodeId: pickString(record, ["node_id", "nodeId"]),
    nodeLabel: pickString(record, ["node_label", "nodeLabel"]),
    status:
      (pickString(record, ["status", "approval_status"]) || "pending").toLowerCase(),
    reviewerGroup:
      pickString(record, [
        "reviewer_group",
        "reviewerGroup",
        "reviewer_team",
        "reviewerTeam",
      ]) ||
      pickString(metadata, [
        "reviewer_group",
        "reviewerGroup",
        "reviewer_team",
        "reviewerTeam",
      ]),
    reviewerRole:
      pickString(record, ["reviewer_role", "reviewerRole"]) ||
      pickString(metadata, ["reviewer_role", "reviewerRole"]),
    instructions:
      pickString(record, [
        "instructions",
        "approval_instructions",
        "approvalInstructions",
      ]) ||
      pickString(metadata, [
        "instructions",
        "approval_instructions",
        "approvalInstructions",
      ]),
    slaMinutes,
    requestedAt,
    dueAt,
    decidedAt: pickString(record, ["decided_at", "resolved_at", "completed_at"]),
    decidedBy: pickString(record, [
      "decision_actor_id",
      "decided_by",
      "resolved_by",
      "approved_by",
    ]),
    decisionComment: pickString(record, [
      "decision_comment",
      "comment",
      "reason",
      "notes",
    ]),
    metadata,
    createdAt: pickString(record, ["created_at"]),
  };
}

export function isWorkflowApprovalTerminalStatus(status: string): boolean {
  return WORKFLOW_APPROVAL_TERMINAL_STATUSES.has(status.trim().toLowerCase());
}

export function formatWorkflowApprovalStatus(status: string): string {
  return status.replace(/_/g, " ");
}
