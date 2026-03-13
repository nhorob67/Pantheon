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
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

export interface EnqueueDiscordCanaryRunInput {
  tenantId: string;
  customerId: string;
  requestTraceId: string;
  idempotencyKey: string;
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

function mapRuntimeRunRow(row: Record<string, unknown>): TenantRuntimeRun {
  return {
    id: String(row.id || ""),
    tenant_id: String(row.tenant_id || ""),
    customer_id: String(row.customer_id || ""),
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
    metadata: sanitizeObject(row.metadata),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

export async function enqueueDiscordRuntimeRun(
  admin: SupabaseClient,
  input: EnqueueDiscordRuntimeRunInput
): Promise<TenantRuntimeRun> {
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      run_kind: input.runKind,
      source: "discord_ingress",
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

export async function claimTenantRuntimeRuns(
  admin: SupabaseClient,
  input: ClaimTenantRuntimeRunsInput
): Promise<TenantRuntimeQueueClaim[]> {
  const leaseSeconds = input.leaseSeconds ?? 90;
  const nowIso = new Date().toISOString();
  const lockExpiresAt = new Date(Date.now() + leaseSeconds * 1000).toISOString();

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
    const next = assertTenantRuntimeRunTransition(row.status, "start");
    const { data: claimed, error: claimError } = await admin
      .from("tenant_runtime_runs")
      .update({
        status: next,
        started_at: new Date().toISOString(),
        worker_id: input.workerId,
        lock_expires_at: lockExpiresAt,
        attempt_count: row.attempt_count + 1,
      })
      .eq("id", row.id)
      .eq("status", row.status)
      .select(TENANT_RUNTIME_RUN_SELECT)
      .maybeSingle();

    if (claimError) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(claimError, "Failed to claim tenant runtime run")
      );
    }

    if (!claimed) {
      continue;
    }

    claims.push({
      run: mapRuntimeRunRow(claimed as unknown as Record<string, unknown>),
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
  const lockExpiresAt = new Date(Date.now() + leaseSeconds * 1000).toISOString();
  const next = assertTenantRuntimeRunTransition("queued", "start"); // "running"

  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .update({
      status: next,
      started_at: new Date().toISOString(),
      worker_id: workerId,
      lock_expires_at: lockExpiresAt,
      attempt_count: 1,
    })
    .eq("id", runId)
    .eq("status", "queued")
    .select(TENANT_RUNTIME_RUN_SELECT)
    .maybeSingle();

  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to claim tenant runtime run by ID")
    );
  }

  return data ? mapRuntimeRunRow(data as unknown as Record<string, unknown>) : null;
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
