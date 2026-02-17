import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_RUN_STEP_STATUSES,
  WORKFLOW_RUN_TRIGGER_TYPES,
  type WorkflowNodeType,
  type WorkflowRun,
  type WorkflowRunArtifact,
  type WorkflowRunStatus,
  type WorkflowRunStep,
  type WorkflowRunStepStatus,
  type WorkflowRunTriggerType,
} from "@/types/workflow";

const WORKFLOW_RUN_STATUS_VALUES = new Set<WorkflowRunStatus>(
  WORKFLOW_RUN_STATUSES
);
const WORKFLOW_RUN_TRIGGER_VALUES = new Set<WorkflowRunTriggerType>(
  WORKFLOW_RUN_TRIGGER_TYPES
);
const WORKFLOW_RUN_STEP_STATUS_VALUES = new Set<WorkflowRunStepStatus>(
  WORKFLOW_RUN_STEP_STATUSES
);
const WORKFLOW_NODE_TYPE_VALUES = new Set<WorkflowNodeType>(WORKFLOW_NODE_TYPES);

interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  trigger_type: string;
  status: string;
  source_version: number;
  retry_of_run_id: string | null;
  requested_by: string | null;
  runtime_correlation_id: string | null;
  input_payload: unknown;
  output_payload: unknown;
  error_message: string | null;
  metadata: unknown;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowRunStepRow {
  id: string;
  run_id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  node_id: string;
  node_type: string;
  step_index: number;
  attempt: number;
  status: string;
  input_payload: unknown;
  output_payload: unknown;
  error_message: string | null;
  metadata: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowRunArtifactRow {
  id: string;
  run_id: string;
  step_id: string | null;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  artifact_type: string;
  name: string;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  payload: unknown;
  metadata: unknown;
  created_at: string;
}

const RUN_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, trigger_type, status, source_version, retry_of_run_id, requested_by, runtime_correlation_id, input_payload, output_payload, error_message, metadata, started_at, completed_at, canceled_at, created_at, updated_at";
const RUN_STEP_SELECT_COLUMNS =
  "id, run_id, workflow_id, instance_id, customer_id, node_id, node_type, step_index, attempt, status, input_payload, output_payload, error_message, metadata, started_at, completed_at, created_at, updated_at";
const RUN_ARTIFACT_SELECT_COLUMNS =
  "id, run_id, step_id, workflow_id, instance_id, customer_id, artifact_type, name, mime_type, storage_bucket, storage_path, payload, metadata, created_at";

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeWorkflowRunStatus(value: string): WorkflowRunStatus {
  if (WORKFLOW_RUN_STATUS_VALUES.has(value as WorkflowRunStatus)) {
    return value as WorkflowRunStatus;
  }

  return "queued";
}

function normalizeWorkflowRunTriggerType(value: string): WorkflowRunTriggerType {
  if (WORKFLOW_RUN_TRIGGER_VALUES.has(value as WorkflowRunTriggerType)) {
    return value as WorkflowRunTriggerType;
  }

  return "manual";
}

function normalizeWorkflowRunStepStatus(value: string): WorkflowRunStepStatus {
  if (WORKFLOW_RUN_STEP_STATUS_VALUES.has(value as WorkflowRunStepStatus)) {
    return value as WorkflowRunStepStatus;
  }

  return "pending";
}

function normalizeWorkflowNodeType(value: string): WorkflowNodeType {
  if (WORKFLOW_NODE_TYPE_VALUES.has(value as WorkflowNodeType)) {
    return value as WorkflowNodeType;
  }

  return "action";
}

export function normalizeWorkflowRunRow(row: WorkflowRunRow): WorkflowRun {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    trigger_type: normalizeWorkflowRunTriggerType(row.trigger_type),
    status: normalizeWorkflowRunStatus(row.status),
    source_version: row.source_version,
    retry_of_run_id: row.retry_of_run_id,
    requested_by: row.requested_by,
    runtime_correlation_id: row.runtime_correlation_id,
    input_payload: normalizeObject(row.input_payload),
    output_payload:
      row.output_payload === null
        ? null
        : normalizeObject(row.output_payload),
    error_message: row.error_message,
    metadata: normalizeObject(row.metadata),
    started_at: row.started_at,
    completed_at: row.completed_at,
    canceled_at: row.canceled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWorkflowRunStepRow(
  row: WorkflowRunStepRow
): WorkflowRunStep {
  return {
    id: row.id,
    run_id: row.run_id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    node_id: row.node_id,
    node_type: normalizeWorkflowNodeType(row.node_type),
    step_index: row.step_index,
    attempt: row.attempt,
    status: normalizeWorkflowRunStepStatus(row.status),
    input_payload: normalizeObject(row.input_payload),
    output_payload:
      row.output_payload === null
        ? null
        : normalizeObject(row.output_payload),
    error_message: row.error_message,
    metadata: normalizeObject(row.metadata),
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWorkflowRunArtifactRow(
  row: WorkflowRunArtifactRow
): WorkflowRunArtifact {
  return {
    id: row.id,
    run_id: row.run_id,
    step_id: row.step_id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    artifact_type: row.artifact_type,
    name: row.name,
    mime_type: row.mime_type,
    storage_bucket: row.storage_bucket,
    storage_path: row.storage_path,
    payload: row.payload,
    metadata: normalizeObject(row.metadata),
    created_at: row.created_at,
  };
}

interface WorkflowRunListParams {
  instanceId: string;
  customerId: string;
  workflowId?: string;
  status?: WorkflowRunStatus;
  limit: number;
  offset: number;
  cursor?: string;
  startedFrom?: string;
  startedTo?: string;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
}

export interface WorkflowRunListPageResult {
  runs: WorkflowRun[];
  nextCursor: string | null;
}

const DURATION_FILTER_SCAN_CAP = 1000;
const CREATED_AT_ID_CURSOR_DELIMITER = "|";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreatedAtIdCursor {
  createdAt: string;
  id: string;
}

function toStartOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function resolveRunDurationSeconds(row: WorkflowRunRow, nowMs: number): number | null {
  if (!row.started_at) {
    return null;
  }

  const startedMs = Date.parse(row.started_at);
  if (Number.isNaN(startedMs)) {
    return null;
  }

  const terminalMs = row.completed_at ? Date.parse(row.completed_at) : nowMs;
  if (Number.isNaN(terminalMs)) {
    return null;
  }

  return Math.max(0, Math.floor((terminalMs - startedMs) / 1000));
}

function matchesDurationFilter(
  row: WorkflowRunRow,
  minDurationSeconds: number | undefined,
  maxDurationSeconds: number | undefined,
  nowMs: number
): boolean {
  if (minDurationSeconds === undefined && maxDurationSeconds === undefined) {
    return true;
  }

  const durationSeconds = resolveRunDurationSeconds(row, nowMs);
  if (durationSeconds === null) {
    return false;
  }

  if (minDurationSeconds !== undefined && durationSeconds < minDurationSeconds) {
    return false;
  }

  if (maxDurationSeconds !== undefined && durationSeconds > maxDurationSeconds) {
    return false;
  }

  return true;
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

function encodeCreatedAtIdCursor(row: Pick<WorkflowRunRow, "created_at" | "id">): string {
  const createdAtMs = Date.parse(row.created_at);
  const normalizedCreatedAt = Number.isNaN(createdAtMs)
    ? row.created_at
    : new Date(createdAtMs).toISOString();
  return `${normalizedCreatedAt}${CREATED_AT_ID_CURSOR_DELIMITER}${row.id}`;
}

function resolveNextCursor(rows: WorkflowRunRow[], limit: number): string | null {
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

export async function listWorkflowRunsPage(
  admin: SupabaseClient,
  params: WorkflowRunListParams
): Promise<WorkflowRunListPageResult> {
  const {
    instanceId,
    customerId,
    workflowId,
    status,
    limit,
    offset,
    cursor,
    startedFrom,
    startedTo,
    minDurationSeconds,
    maxDurationSeconds,
  } = params;
  const parsedCursor = decodeCreatedAtIdCursor(cursor);
  const hasCursor = parsedCursor !== null;

  let query = admin
    .from("workflow_runs")
    .select(RUN_SELECT_COLUMNS)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (workflowId) {
    query = query.eq("workflow_id", workflowId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (startedFrom) {
    query = query.gte("started_at", toStartOfDayIso(startedFrom));
  }

  if (startedTo) {
    query = query.lte("started_at", toEndOfDayIso(startedTo));
  }

  query = applyCreatedAtIdCursorFilter(query, parsedCursor);

  const hasDurationFilter =
    minDurationSeconds !== undefined || maxDurationSeconds !== undefined;
  const nowMs = Date.now();

  if (!hasDurationFilter) {
    const rangeStart = hasCursor ? 0 : offset;
    const { data, error } = await query.range(rangeStart, rangeStart + limit);

    if (error) {
      throw new Error(safeErrorMessage(error, "Failed to load workflow runs"));
    }

    const rows = (data || []) as WorkflowRunRow[];
    return {
      runs: rows.slice(0, limit).map(normalizeWorkflowRunRow),
      nextCursor: resolveNextCursor(rows, limit),
    };
  }

  const scanWindowStart = hasCursor ? 0 : offset;
  const scanSize = Math.min(
    DURATION_FILTER_SCAN_CAP,
    Math.max(scanWindowStart + limit + 201, limit + 1)
  );
  const { data, error } = await query.range(0, scanSize - 1);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow runs"));
  }

  const filteredRows = ((data || []) as WorkflowRunRow[]).filter((row) =>
    matchesDurationFilter(row, minDurationSeconds, maxDurationSeconds, nowMs)
  );
  const filteredWindow = filteredRows.slice(
    scanWindowStart,
    scanWindowStart + limit + 1
  );

  return {
    runs: filteredWindow.slice(0, limit).map(normalizeWorkflowRunRow),
    nextCursor: resolveNextCursor(filteredWindow, limit),
  };
}

export async function listWorkflowRuns(
  admin: SupabaseClient,
  params: WorkflowRunListParams
): Promise<WorkflowRun[]> {
  const result = await listWorkflowRunsPage(admin, params);
  return result.runs;
}

export async function getWorkflowRun(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  runId: string
): Promise<WorkflowRun | null> {
  const { data, error } = await admin
    .from("workflow_runs")
    .select(RUN_SELECT_COLUMNS)
    .eq("id", runId)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow run"));
  }

  if (!data) {
    return null;
  }

  return normalizeWorkflowRunRow(data as WorkflowRunRow);
}

export async function getWorkflowRunDetail(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  runId: string
): Promise<
  | {
      run: WorkflowRun;
      steps: WorkflowRunStep[];
      artifacts: WorkflowRunArtifact[];
    }
  | null
> {
  const [runResult, stepResult, artifactResult] = await Promise.all([
    admin
      .from("workflow_runs")
      .select(RUN_SELECT_COLUMNS)
      .eq("id", runId)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .maybeSingle(),
    admin
      .from("workflow_run_steps")
      .select(RUN_STEP_SELECT_COLUMNS)
      .eq("run_id", runId)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .order("step_index", { ascending: true })
      .order("attempt", { ascending: true }),
    admin
      .from("workflow_run_artifacts")
      .select(RUN_ARTIFACT_SELECT_COLUMNS)
      .eq("run_id", runId)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
  ]);

  if (runResult.error) {
    throw new Error(safeErrorMessage(runResult.error, "Failed to load workflow run"));
  }

  if (stepResult.error) {
    throw new Error(
      safeErrorMessage(stepResult.error, "Failed to load workflow run steps")
    );
  }

  if (artifactResult.error) {
    throw new Error(
      safeErrorMessage(artifactResult.error, "Failed to load workflow run artifacts")
    );
  }

  if (!runResult.data) {
    return null;
  }

  return {
    run: normalizeWorkflowRunRow(runResult.data as WorkflowRunRow),
    steps: ((stepResult.data || []) as WorkflowRunStepRow[]).map(
      normalizeWorkflowRunStepRow
    ),
    artifacts: ((artifactResult.data || []) as WorkflowRunArtifactRow[]).map(
      normalizeWorkflowRunArtifactRow
    ),
  };
}
