import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_APPROVAL_STATUSES,
  type WorkflowApproval,
  type WorkflowApprovalStatus,
} from "@/types/workflow";

const WORKFLOW_APPROVAL_STATUS_VALUES = new Set<WorkflowApprovalStatus>(
  WORKFLOW_APPROVAL_STATUSES
);

interface WorkflowApprovalRow {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_label: string | null;
  status: string;
  sla_due_at: string | null;
  decision_comment: string | null;
  decision_actor_id: string | null;
  decided_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

const WORKFLOW_APPROVAL_SELECT_COLUMNS =
  "id, run_id, workflow_id, instance_id, customer_id, node_id, node_label, status, sla_due_at, decision_comment, decision_actor_id, decided_at, approved_at, rejected_at, canceled_at, expired_at, metadata, created_at, updated_at";

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeApprovalStatus(value: string): WorkflowApprovalStatus {
  if (WORKFLOW_APPROVAL_STATUS_VALUES.has(value as WorkflowApprovalStatus)) {
    return value as WorkflowApprovalStatus;
  }

  return "pending";
}

export function normalizeWorkflowApprovalRow(
  row: WorkflowApprovalRow
): WorkflowApproval {
  return {
    id: row.id,
    run_id: row.run_id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    node_id: row.node_id,
    node_label: row.node_label,
    status: normalizeApprovalStatus(row.status),
    sla_due_at: row.sla_due_at,
    decision_comment: row.decision_comment,
    decision_actor_id: row.decision_actor_id,
    decided_at: row.decided_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    canceled_at: row.canceled_at,
    expired_at: row.expired_at,
    metadata: normalizeObject(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface WorkflowApprovalListParams {
  instanceId: string;
  customerId: string;
  runId?: string;
  workflowId?: string;
  status?: WorkflowApprovalStatus;
  limit: number;
  offset: number;
  cursor?: string;
}

export interface WorkflowApprovalListPageResult {
  approvals: WorkflowApproval[];
  nextCursor: string | null;
}

const CREATED_AT_ID_CURSOR_DELIMITER = "|";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreatedAtIdCursor {
  createdAt: string;
  id: string;
}

function decodeCreatedAtIdCursor(cursor?: string): CreatedAtIdCursor | null {
  if (!cursor || cursor.length === 0) {
    return null;
  }

  const delimiterIndex = cursor.indexOf(CREATED_AT_ID_CURSOR_DELIMITER);
  if (delimiterIndex <= 0 || delimiterIndex >= cursor.length - 1) {
    return null;
  }

  const createdAt = cursor.slice(0, delimiterIndex);
  const id = cursor.slice(delimiterIndex + 1);
  if (id.includes(CREATED_AT_ID_CURSOR_DELIMITER)) {
    return null;
  }
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return null;
  }
  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  return { createdAt: new Date(createdAtMs).toISOString(), id };
}

function encodeCreatedAtIdCursor(
  row: Pick<WorkflowApprovalRow, "created_at" | "id">
): string {
  const createdAtMs = Date.parse(row.created_at);
  const normalizedCreatedAt = Number.isNaN(createdAtMs)
    ? row.created_at
    : new Date(createdAtMs).toISOString();
  return `${normalizedCreatedAt}${CREATED_AT_ID_CURSOR_DELIMITER}${row.id}`;
}

function resolveNextCursor(
  rows: WorkflowApprovalRow[],
  limit: number
): string | null {
  if (rows.length <= limit) {
    return null;
  }

  const lastVisibleRow = rows[limit - 1];
  if (!lastVisibleRow) {
    return null;
  }

  return encodeCreatedAtIdCursor(lastVisibleRow);
}

function applyCreatedAtIdCursorFilter<T extends { or: (filters: string) => T }>(
  query: T,
  cursor: CreatedAtIdCursor | null
): T {
  if (!cursor) {
    return query;
  }

  return query.or(
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
  );
}

export async function listWorkflowApprovalsPage(
  admin: SupabaseClient,
  params: WorkflowApprovalListParams
): Promise<WorkflowApprovalListPageResult> {
  const {
    instanceId,
    customerId,
    runId,
    workflowId,
    status,
    limit,
    offset,
    cursor,
  } = params;
  const parsedCursor = decodeCreatedAtIdCursor(cursor);
  const hasCursor = parsedCursor !== null;

  let query = admin
    .from("workflow_approvals")
    .select(WORKFLOW_APPROVAL_SELECT_COLUMNS)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (runId) {
    query = query.eq("run_id", runId);
  }

  if (workflowId) {
    query = query.eq("workflow_id", workflowId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  query = applyCreatedAtIdCursorFilter(query, parsedCursor);

  const rangeStart = hasCursor ? 0 : offset;
  const { data, error } = await query.range(rangeStart, rangeStart + limit);

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow approvals")
    );
  }

  const rows = (data || []) as WorkflowApprovalRow[];
  return {
    approvals: rows.slice(0, limit).map(normalizeWorkflowApprovalRow),
    nextCursor: resolveNextCursor(rows, limit),
  };
}

export async function listWorkflowApprovals(
  admin: SupabaseClient,
  params: WorkflowApprovalListParams
): Promise<WorkflowApproval[]> {
  const result = await listWorkflowApprovalsPage(admin, params);
  return result.approvals;
}

export async function getWorkflowApproval(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  approvalId: string
): Promise<WorkflowApproval | null> {
  const { data, error } = await admin
    .from("workflow_approvals")
    .select(WORKFLOW_APPROVAL_SELECT_COLUMNS)
    .eq("id", approvalId)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow approval")
    );
  }

  if (!data) {
    return null;
  }

  return normalizeWorkflowApprovalRow(data as WorkflowApprovalRow);
}

export async function listWorkflowApprovalsForRun(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  runId: string
): Promise<WorkflowApproval[]> {
  const { data, error } = await admin
    .from("workflow_approvals")
    .select(WORKFLOW_APPROVAL_SELECT_COLUMNS)
    .eq("run_id", runId)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow approvals")
    );
  }

  return ((data || []) as WorkflowApprovalRow[]).map(normalizeWorkflowApprovalRow);
}
