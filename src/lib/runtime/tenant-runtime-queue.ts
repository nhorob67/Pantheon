import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  TenantRuntimeRun,
  TenantRuntimeRunKind,
  TenantRuntimeRunStatus,
} from "@/types/tenant-runtime";
import { assertTenantRuntimeRunTransition } from "./tenant-runtime-run-state";

const TENANT_RUNTIME_RUN_SELECT = [
  "id",
  "tenant_id",
  "customer_id",
  "session_id",
  "run_kind",
  "source",
  "status",
  "attempt_count",
  "max_attempts",
  "idempotency_key",
  "request_trace_id",
  "correlation_id",
  "payload",
  "result",
  "error_message",
  "queued_at",
  "started_at",
  "completed_at",
  "canceled_at",
  "lock_expires_at",
  "worker_id",
  "parent_run_id",
  "delegation_depth",
  "deadline_at",
  "delegation_kind",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

export interface EnqueueDiscordCanaryRunInput {
  tenantId: string;
  customerId: string;
  requestTraceId: string;
  idempotencyKey: string;
  sessionId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface EnqueueDiscordRuntimeRunInput extends EnqueueDiscordCanaryRunInput {
  runKind: TenantRuntimeRunKind;
}

export interface ClaimTenantRuntimeRunsInput {
  workerId: string;
  limit: number;
  leaseSeconds?: number;
  runKind?: TenantRuntimeRunKind;
}

export interface TenantRuntimeQueueClaim {
  run: TenantRuntimeRun;
  previousStatus: TenantRuntimeRunStatus;
}

export interface ListTenantRuntimeDeadLetterRunsInput {
  limit?: number;
  tenantId?: string | null;
  runKind?: TenantRuntimeRunKind;
}

export class TenantRuntimeQueueError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function sanitizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function resolveDiscordCompletionNotificationsEnabled(
  admin: SupabaseClient,
  customerId: string
): Promise<boolean> {
  const { data } = await admin
    .from("team_profiles")
    .select("discord_completion_notifications_enabled")
    .eq("customer_id", customerId)
    .maybeSingle();

  return data?.discord_completion_notifications_enabled ?? true;
}

async function resolveRuntimeRunMetadata(
  admin: SupabaseClient,
  input: EnqueueDiscordRuntimeRunInput
): Promise<Record<string, unknown>> {
  const metadata = { ...(input.metadata || {}) };

  if (input.runKind !== "discord_runtime") {
    return metadata;
  }

  if (typeof metadata.notify_on_completion === "boolean") {
    metadata.completion_notification_source = "run_override";
    return metadata;
  }

  const payloadRunKind =
    typeof input.payload.run_kind === "string" ? input.payload.run_kind : null;
  if (payloadRunKind === "discord_cron") {
    metadata.notify_on_completion = false;
    metadata.completion_notification_source = "system_default";
    return metadata;
  }

  metadata.notify_on_completion = await resolveDiscordCompletionNotificationsEnabled(
    admin,
    input.customerId
  );
  metadata.completion_notification_source = "team_default";

  return metadata;
}

function mapRuntimeRunRow(row: Record<string, unknown>): TenantRuntimeRun {
  return {
    id: String(row.id || ""),
    tenant_id: String(row.tenant_id || ""),
    customer_id: String(row.customer_id || ""),
    session_id: typeof row.session_id === "string" ? row.session_id : null,
    run_kind: row.run_kind as TenantRuntimeRun["run_kind"],
    source: row.source as TenantRuntimeRun["source"],
    status: row.status as TenantRuntimeRunStatus,
    attempt_count: Number(row.attempt_count || 0),
    max_attempts: Number(row.max_attempts || 0),
    idempotency_key:
      typeof row.idempotency_key === "string" ? row.idempotency_key : null,
    request_trace_id:
      typeof row.request_trace_id === "string" ? row.request_trace_id : null,
    correlation_id: typeof row.correlation_id === "string" ? row.correlation_id : null,
    payload: sanitizeObject(row.payload),
    result: sanitizeObject(row.result),
    error_message: typeof row.error_message === "string" ? row.error_message : null,
    queued_at: String(row.queued_at || ""),
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    canceled_at: typeof row.canceled_at === "string" ? row.canceled_at : null,
    lock_expires_at:
      typeof row.lock_expires_at === "string" ? row.lock_expires_at : null,
    worker_id: typeof row.worker_id === "string" ? row.worker_id : null,
    parent_run_id: typeof row.parent_run_id === "string" ? row.parent_run_id : null,
    delegation_depth: Number(row.delegation_depth || 0),
    deadline_at: typeof row.deadline_at === "string" ? row.deadline_at : null,
    delegation_kind: typeof row.delegation_kind === "string" ? row.delegation_kind : null,
    metadata: sanitizeObject(row.metadata),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

const SESSION_LANE_RUN_KINDS = new Set<TenantRuntimeRunKind>([
  "discord_runtime",
  "email_runtime",
]);

function isSessionLaneBoundRun(
  run: Pick<TenantRuntimeRun, "run_kind" | "session_id">
): boolean {
  return SESSION_LANE_RUN_KINDS.has(run.run_kind) && typeof run.session_id === "string";
}

function compareRuntimeRunOrder(
  left: Pick<TenantRuntimeRun, "id" | "queued_at" | "created_at">,
  right: Pick<TenantRuntimeRun, "id" | "queued_at" | "created_at">
): number {
  const queuedAtDiff = left.queued_at.localeCompare(right.queued_at);
  if (queuedAtDiff !== 0) {
    return queuedAtDiff;
  }

  const createdAtDiff = left.created_at.localeCompare(right.created_at);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return left.id.localeCompare(right.id);
}

export function sessionLaneBlocksRun(
  candidate: Pick<
    TenantRuntimeRun,
    "id" | "session_id" | "run_kind" | "status" | "queued_at" | "created_at"
  >,
  blocker: Pick<
    TenantRuntimeRun,
    "id" | "session_id" | "run_kind" | "status" | "queued_at" | "created_at"
  >
): boolean {
  if (!isSessionLaneBoundRun(candidate) || !isSessionLaneBoundRun(blocker)) {
    return false;
  }

  if (candidate.id === blocker.id || candidate.session_id !== blocker.session_id) {
    return false;
  }

  if (blocker.status === "running" || blocker.status === "awaiting_approval") {
    return true;
  }

  if (blocker.status !== "queued") {
    return false;
  }

  return compareRuntimeRunOrder(blocker, candidate) < 0;
}

function runLockAvailable(
  run: Pick<TenantRuntimeRun, "lock_expires_at">,
  nowIso: string
): boolean {
  return !run.lock_expires_at || run.lock_expires_at < nowIso;
}

async function findSessionLaneBlocker(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<TenantRuntimeRun | null> {
  if (!isSessionLaneBoundRun(run)) {
    return null;
  }

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("tenant_id", run.tenant_id)
    .eq("session_id", run.session_id)
    .in("status", ["queued", "running", "awaiting_approval"])
    .limit(50);

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to resolve session lane blockers")
    );
  }

  const blockers = ((data || []) as unknown as Record<string, unknown>[])
    .map(mapRuntimeRunRow)
    .filter((candidate) => sessionLaneBlocksRun(run, candidate))
    .sort(compareRuntimeRunOrder);

  return blockers[0] ?? null;
}

export async function enqueueDiscordRuntimeRun(
  admin: SupabaseClient,
  input: EnqueueDiscordRuntimeRunInput
): Promise<TenantRuntimeRun> {
  const metadata = await resolveRuntimeRunMetadata(admin, input);
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      session_id: input.sessionId ?? null,
      run_kind: input.runKind,
      source: "discord_ingress",
      status: "queued",
      idempotency_key: input.idempotencyKey,
      request_trace_id: input.requestTraceId,
      correlation_id: input.idempotencyKey,
      payload: input.payload,
      metadata,
      queued_at: new Date().toISOString(),
    })
    .select(TENANT_RUNTIME_RUN_SELECT)
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing, error: existingError } = await admin
      .from("tenant_runtime_runs")
      .select(TENANT_RUNTIME_RUN_SELECT)
      .eq("tenant_id", input.tenantId)
      .eq("run_kind", input.runKind)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingError || !existing) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(existingError, "Failed to resolve duplicate tenant runtime run")
      );
    }

    return mapRuntimeRunRow(existing as unknown as Record<string, unknown>);
  }

  if (error || !data) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to enqueue tenant runtime run")
    );
  }

  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

export async function enqueueDiscordCanaryRun(
  admin: SupabaseClient,
  input: EnqueueDiscordCanaryRunInput
): Promise<TenantRuntimeRun> {
  return enqueueDiscordRuntimeRun(admin, {
    ...input,
    runKind: "discord_canary",
  });
}

export interface EnqueueEmailRuntimeRunInput {
  tenantId: string;
  customerId: string;
  sessionId: string;
  requestTraceId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function enqueueEmailRuntimeRun(
  admin: SupabaseClient,
  input: EnqueueEmailRuntimeRunInput
): Promise<TenantRuntimeRun> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      session_id: input.sessionId,
      run_kind: "email_runtime",
      source: "email_ingress",
      status: "queued",
      idempotency_key: input.idempotencyKey,
      request_trace_id: input.requestTraceId,
      correlation_id: input.idempotencyKey,
      payload: input.payload,
      metadata: input.metadata || {},
      queued_at: new Date().toISOString(),
    })
    .select(TENANT_RUNTIME_RUN_SELECT)
    .single();

  if (error && (error as { code?: string }).code === "23505") {
    const { data: existing, error: existingError } = await admin
      .from("tenant_runtime_runs")
      .select(TENANT_RUNTIME_RUN_SELECT)
      .eq("tenant_id", input.tenantId)
      .eq("run_kind", "email_runtime")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingError || !existing) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(existingError, "Failed to resolve duplicate email runtime run")
      );
    }

    return mapRuntimeRunRow(existing as unknown as Record<string, unknown>);
  }

  if (error || !data) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to enqueue email runtime run")
    );
  }

  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

export async function claimQueuedTenantRuntimeRun(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  workerId: string,
  leaseSeconds = 120
): Promise<TenantRuntimeRun | null> {
  if (run.status !== "queued") {
    return null;
  }

  const nowIso = new Date().toISOString();
  if (!runLockAvailable(run, nowIso)) {
    return null;
  }

  const blocker = await findSessionLaneBlocker(admin, run);
  if (blocker) {
    return null;
  }

  const lockExpiresAt = new Date(Date.now() + leaseSeconds * 1000).toISOString();
  const next = assertTenantRuntimeRunTransition("queued", "start");

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .update({
      status: next,
      started_at: new Date().toISOString(),
      worker_id: workerId,
      lock_expires_at: lockExpiresAt,
      attempt_count: run.attempt_count + 1,
    })
    .eq("id", run.id)
    .eq("status", "queued")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .maybeSingle();

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to claim tenant runtime run")
    );
  }

  return data ? mapRuntimeRunRow(data as unknown as Record<string, unknown>) : null;
}

export async function claimTenantRuntimeRuns(
  admin: SupabaseClient,
  input: ClaimTenantRuntimeRunsInput
): Promise<TenantRuntimeQueueClaim[]> {
  const leaseSeconds = input.leaseSeconds ?? 90;
  const nowIso = new Date().toISOString();

  let query = admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("status", "queued")
    .or(`lock_expires_at.is.null,lock_expires_at.lt.${nowIso}`)
    .order("queued_at", { ascending: true })
    .limit(input.limit);

  if (input.runKind) {
    query = query.eq("run_kind", input.runKind);
  }

  const { data, error } = await query;
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to read queued tenant runtime runs")
    );
  }

  const rows = ((data || []) as unknown as Record<string, unknown>[]).map(mapRuntimeRunRow);
  if (rows.length === 0) {
    return [];
  }

  const claims: TenantRuntimeQueueClaim[] = [];

  for (const row of rows) {
    const claimed = await claimQueuedTenantRuntimeRun(
      admin,
      row,
      input.workerId,
      leaseSeconds
    );
    if (!claimed) {
      continue;
    }

    claims.push({
      run: claimed,
      previousStatus: row.status,
    });
  }

  return claims;
}

export async function claimTenantRuntimeRunById(
  admin: SupabaseClient,
  runId: string,
  workerId: string,
  leaseSeconds = 120
): Promise<TenantRuntimeRun | null> {
  const run = await getTenantRuntimeRunById(admin, runId);
  if (!run) {
    return null;
  }

  return claimQueuedTenantRuntimeRun(admin, run, workerId, leaseSeconds);
}

export async function getNextQueuedSessionLaneRun(
  admin: SupabaseClient,
  run: Pick<TenantRuntimeRun, "tenant_id" | "session_id" | "run_kind">
): Promise<TenantRuntimeRun | null> {
  if (!isSessionLaneBoundRun(run)) {
    return null;
  }

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("tenant_id", run.tenant_id)
    .eq("session_id", run.session_id)
    .eq("status", "queued")
    .in("run_kind", ["discord_runtime", "email_runtime"])
    .limit(50);

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to resolve next queued session lane run")
    );
  }

  const nowIso = new Date().toISOString();
  const next = ((data || []) as unknown as Record<string, unknown>[])
    .map(mapRuntimeRunRow)
    .sort(compareRuntimeRunOrder)
    .find((candidate) => runLockAvailable(candidate, nowIso));

  return next ?? null;
}

export async function getTenantRuntimeRunById(
  admin: SupabaseClient,
  runId: string
): Promise<TenantRuntimeRun | null> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("id", runId)
    .maybeSingle();

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant runtime run")
    );
  }

  if (!data) {
    return null;
  }

  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

export async function listTenantRuntimeDeadLetterRuns(
  admin: SupabaseClient,
  input: ListTenantRuntimeDeadLetterRunsInput = {}
): Promise<TenantRuntimeRun[]> {
  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  let query = admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.tenantId) {
    query = query.eq("tenant_id", input.tenantId);
  }
  if (input.runKind) {
    query = query.eq("run_kind", input.runKind);
  }

  const { data, error } = await query;
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to list tenant runtime dead-letter runs")
    );
  }

  return ((data || []) as unknown as Record<string, unknown>[]).map(mapRuntimeRunRow);
}

export async function patchTenantRuntimeRunMetadata(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  patch: Record<string, unknown>
): Promise<TenantRuntimeRun> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .update({
      metadata: {
        ...run.metadata,
        ...patch,
        metadata_patched_at: new Date().toISOString(),
      },
    })
    .eq("id", run.id)
    .select(TENANT_RUNTIME_RUN_SELECT)
    .maybeSingle();

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to patch tenant runtime run metadata")
    );
  }
  if (!data) {
    throw new TenantRuntimeQueueError(404, "Tenant runtime run not found");
  }
  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

export async function accountAsyncDelegationBudget(
  admin: SupabaseClient,
  input: {
    parentRunId: string;
    childRunId: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostCents: number;
  }
): Promise<{
  accounted: boolean;
  already_accounted: boolean;
  async_delegation_input_tokens?: number;
  async_delegation_output_tokens?: number;
  async_delegation_spend_cents?: number;
}> {
  const { data, error } = await admin.rpc("account_async_delegation_budget", {
    p_parent_run_id: input.parentRunId,
    p_child_run_id: input.childRunId,
    p_input_tokens: input.inputTokens,
    p_output_tokens: input.outputTokens,
    p_estimated_cost_cents: input.estimatedCostCents,
  });

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to account async delegation budget")
    );
  }

  const payload =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  return {
    accounted: payload.accounted === true,
    already_accounted: payload.already_accounted === true,
    async_delegation_input_tokens:
      typeof payload.async_delegation_input_tokens === "number"
        ? payload.async_delegation_input_tokens
        : undefined,
    async_delegation_output_tokens:
      typeof payload.async_delegation_output_tokens === "number"
        ? payload.async_delegation_output_tokens
        : undefined,
    async_delegation_spend_cents:
      typeof payload.async_delegation_spend_cents === "number"
        ? payload.async_delegation_spend_cents
        : undefined,
  };
}

export async function reserveAsyncDelegationBudget(
  admin: SupabaseClient,
  input: {
    parentRunId: string;
    childRunId: string;
    maxTotalCostCents: number;
    reservedCostCents: number;
  }
): Promise<{ reserved_cents: number; already_reserved: boolean }> {
  const { data, error } = await admin.rpc("reserve_async_delegation_budget", {
    p_parent_run_id: input.parentRunId,
    p_child_run_id: input.childRunId,
    p_max_total_cost_cents: input.maxTotalCostCents,
    p_reserved_cost_cents: input.reservedCostCents,
  });

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to reserve async delegation budget")
    );
  }

  const payload =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  return {
    reserved_cents:
      typeof payload.reserved_cents === "number" ? payload.reserved_cents : 0,
    already_reserved: payload.already_reserved === true,
  };
}

export async function releaseAsyncDelegationBudgetReservation(
  admin: SupabaseClient,
  input: {
    parentRunId: string;
    childRunId: string;
  }
): Promise<{ released: boolean; released_cents: number }> {
  const { data, error } = await admin.rpc("release_async_delegation_budget_reservation", {
    p_parent_run_id: input.parentRunId,
    p_child_run_id: input.childRunId,
  });

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to release async delegation budget reservation")
    );
  }

  const payload =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  return {
    released: payload.released === true,
    released_cents:
      typeof payload.released_cents === "number" ? payload.released_cents : 0,
  };
}

export async function transitionTenantRuntimeRun(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  event:
    | "request_approval"
    | "resume_after_approval"
    | "complete"
    | "fail"
    | "cancel"
    | "retry",
  options?: {
    result?: Record<string, unknown>;
    errorMessage?: string | null;
    workerId?: string | null;
    lockExpiresAt?: string | null;
    queuedAt?: string | null;
    metadataPatch?: Record<string, unknown>;
  }
): Promise<TenantRuntimeRun> {
  const nextStatus = assertTenantRuntimeRunTransition(run.status, event);
  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: nextStatus,
    result: options?.result || run.result,
    error_message: options?.errorMessage || null,
    worker_id: options?.workerId === undefined ? run.worker_id : options.workerId,
    lock_expires_at:
      options?.lockExpiresAt === undefined ? null : options.lockExpiresAt,
    metadata: {
      ...run.metadata,
      ...(options?.metadataPatch || {}),
      last_transition_event: event,
      last_transition_at: nowIso,
    },
  };

  if (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "canceled") {
    updates.completed_at = nowIso;
  }
  if (nextStatus === "queued") {
    updates.queued_at = options?.queuedAt || nowIso;
    updates.started_at = null;
    updates.completed_at = null;
    updates.canceled_at = null;
    if (options?.workerId === undefined) {
      updates.worker_id = null;
    }
  }
  if (nextStatus === "canceled") {
    updates.canceled_at = nowIso;
  }

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .update(updates)
    .eq("id", run.id)
    .eq("status", run.status)
    .select(TENANT_RUNTIME_RUN_SELECT)
    .maybeSingle();

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to transition tenant runtime run")
    );
  }

  if (!data) {
    throw new TenantRuntimeQueueError(
      409,
      "Tenant runtime run transition lost optimistic lock"
    );
  }

  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Async Delegation Helpers
// ---------------------------------------------------------------------------

export interface EnqueueAsyncDelegationRunInput {
  tenantId: string;
  customerId: string;
  parentRunId: string;
  delegationDepth: number;
  deadlineAt: string;
  requestTraceId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function enqueueAsyncDelegationRun(
  admin: SupabaseClient,
  input: EnqueueAsyncDelegationRunInput
): Promise<TenantRuntimeRun> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      run_kind: "delegation_runtime",
      source: "system",
      status: "queued",
      request_trace_id: input.requestTraceId ?? null,
      parent_run_id: input.parentRunId,
      delegation_depth: input.delegationDepth,
      deadline_at: input.deadlineAt,
      delegation_kind: "async",
      payload: input.payload,
      metadata: {
        ...(input.metadata || {}),
        delegation: true,
        async: true,
      },
      queued_at: new Date().toISOString(),
    })
    .select(TENANT_RUNTIME_RUN_SELECT)
    .single();

  if (error || !data) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to enqueue async delegation run")
    );
  }

  return mapRuntimeRunRow(data as unknown as Record<string, unknown>);
}

export async function listChildRunsByParent(
  admin: SupabaseClient,
  parentRunId: string,
  statuses?: TenantRuntimeRunStatus[]
): Promise<TenantRuntimeRun[]> {
  let query = admin
    .from("tenant_runtime_runs")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .eq("parent_run_id", parentRunId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to list child runs")
    );
  }

  return ((data || []) as unknown as Record<string, unknown>[]).map(mapRuntimeRunRow);
}

export async function cancelDelegationTree(
  admin: SupabaseClient,
  parentRunId: string
): Promise<number> {
  const cancelableStatuses: TenantRuntimeRunStatus[] = ["queued", "running", "awaiting_approval"];
  const children = await listChildRunsByParent(admin, parentRunId, cancelableStatuses);

  let canceledCount = 0;
  for (const child of children) {
    try {
      await transitionTenantRuntimeRun(admin, child, "cancel");
      if (child.parent_run_id) {
        await releaseAsyncDelegationBudgetReservation(admin, {
          parentRunId: child.parent_run_id,
          childRunId: child.id,
        }).catch(() => {});
      }
      canceledCount++;
      // Recursively cancel grandchildren
      canceledCount += await cancelDelegationTree(admin, child.id);
    } catch {
      // Best-effort: child may have already transitioned
    }
  }

  return canceledCount;
}
