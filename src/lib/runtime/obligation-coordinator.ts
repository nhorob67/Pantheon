// ---------------------------------------------------------------------------
// Obligation Coordinator
// ---------------------------------------------------------------------------
// Owns the lifecycle of runtime obligations. This is the single integration
// point for opening, transitioning, and closing obligations. All state
// changes are atomic: obligation status update + event log insert.
//
// This replaces the prose-based follow-up detection in progress-replies.ts
// with a durable, testable, restart-safe state machine.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RuntimeObligation,
  ObligationStatus,
  ObligationEventType,
} from "@/types/obligation";
import type { TenantRuntimeRun, TenantRuntimeRunKind } from "@/types/tenant-runtime";
import {
  assertObligationTransition,
  isTerminalObligationStatus,
  type ObligationTransitionEvent,
} from "./obligation-state";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { logSilentCatch } from "@/lib/telemetry/silent-catch";
import { resolveCustomerFeatureFlag } from "@/lib/queries/extensibility";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Run kinds that create user-facing obligations */
const OBLIGATION_RUN_KINDS: ReadonlySet<TenantRuntimeRunKind> = new Set([
  "discord_runtime",
]);

const OBLIGATION_FEATURE_FLAG = "runtime_obligations_enabled";

/** Minimum time between user-visible status updates (ms) */
const STATUS_UPDATE_SILENCE_MS = 30_000;

/** Default obligation deadline (minutes from creation) */
const DEFAULT_DEADLINE_MINUTES = 30;

/** Default stale threshold: if no progress for this long, mark stalled (minutes) */
const STALE_THRESHOLD_MINUTES = 10;

const OBLIGATION_SELECT = [
  "id",
  "tenant_id",
  "customer_id",
  "session_id",
  "channel_id",
  "reply_to_message_id",
  "agent_id",
  "originating_run_id",
  "current_run_id",
  "completion_run_id",
  "status",
  "waiting_on",
  "resume_token",
  "next_check_at",
  "last_progress_at",
  "last_user_update_at",
  "deadline_at",
  "continuation_count",
  "max_continuations",
  "dedupe_key",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapObligationRow(row: Record<string, unknown>): RuntimeObligation {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    customer_id: String(row.customer_id ?? ""),
    session_id: typeof row.session_id === "string" ? row.session_id : null,
    channel_id: typeof row.channel_id === "string" ? row.channel_id : null,
    reply_to_message_id:
      typeof row.reply_to_message_id === "string" ? row.reply_to_message_id : null,
    agent_id: typeof row.agent_id === "string" ? row.agent_id : null,
    originating_run_id: String(row.originating_run_id ?? ""),
    current_run_id:
      typeof row.current_run_id === "string" ? row.current_run_id : null,
    completion_run_id:
      typeof row.completion_run_id === "string" ? row.completion_run_id : null,
    status: row.status as ObligationStatus,
    waiting_on: typeof row.waiting_on === "string" ? row.waiting_on : null,
    resume_token: typeof row.resume_token === "string" ? row.resume_token : null,
    next_check_at:
      typeof row.next_check_at === "string" ? row.next_check_at : null,
    last_progress_at: String(row.last_progress_at ?? ""),
    last_user_update_at:
      typeof row.last_user_update_at === "string" ? row.last_user_update_at : null,
    deadline_at: typeof row.deadline_at === "string" ? row.deadline_at : null,
    continuation_count: Number(row.continuation_count ?? 0),
    max_continuations: Number(row.max_continuations ?? 5),
    dedupe_key: typeof row.dedupe_key === "string" ? row.dedupe_key : null,
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function generateResumeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Gate: should a run create an obligation?
// ---------------------------------------------------------------------------

export function shouldCreateObligation(run: TenantRuntimeRun): boolean {
  return OBLIGATION_RUN_KINDS.has(run.run_kind);
}

export async function isRuntimeObligationsEnabled(
  admin: SupabaseClient,
  customerId: string
): Promise<boolean> {
  try {
    return await resolveCustomerFeatureFlag(admin, customerId, OBLIGATION_FEATURE_FLAG);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Open an obligation
// ---------------------------------------------------------------------------

export interface OpenObligationInput {
  run: TenantRuntimeRun;
  sessionId?: string | null;
  channelId?: string | null;
  replyToMessageId?: string | null;
  agentId?: string | null;
  dedupeKey?: string | null;
}

export async function openObligation(
  admin: SupabaseClient,
  input: OpenObligationInput
): Promise<RuntimeObligation> {
  const now = new Date();
  const deadlineAt = new Date(
    now.getTime() + DEFAULT_DEADLINE_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("runtime_obligations")
    .insert({
      tenant_id: input.run.tenant_id,
      customer_id: input.run.customer_id,
      session_id: input.sessionId ?? null,
      channel_id: input.channelId ?? null,
      reply_to_message_id: input.replyToMessageId ?? null,
      agent_id: input.agentId ?? null,
      originating_run_id: input.run.id,
      current_run_id: input.run.id,
      status: "open",
      deadline_at: deadlineAt,
      dedupe_key: input.dedupeKey ?? null,
      metadata: {
        run_kind: input.run.run_kind,
        source: input.run.source,
      },
    })
    .select(OBLIGATION_SELECT)
    .single();

  if (error && (error as { code?: string }).code === "23505" && input.dedupeKey) {
    // Dedupe hit — return existing obligation
    const { data: existing } = await admin
      .from("runtime_obligations")
      .select(OBLIGATION_SELECT)
      .eq("dedupe_key", input.dedupeKey)
      .maybeSingle();

    if (existing) {
      return mapObligationRow(existing as unknown as Record<string, unknown>);
    }
  }

  if (error || !data) {
    throw new Error(
      safeErrorMessage(error, "Failed to open obligation")
    );
  }

  const obligation = mapObligationRow(data as unknown as Record<string, unknown>);

  // Log the creation event (fire-and-forget, event log is best-effort)
  await insertObligationEvent(admin, {
    obligationId: obligation.id,
    runId: input.run.id,
    eventType: "created",
    toStatus: "open",
    payload: {
      run_kind: input.run.run_kind,
      channel_id: input.channelId,
    },
  }).catch((e) => logSilentCatch("obligation-event-created", e));

  return obligation;
}

export async function recordObligationToolPhase(
  admin: SupabaseClient,
  obligationId: string,
  runId?: string | null,
  payload?: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from("runtime_obligations")
    .update({
      last_progress_at: now,
      updated_at: now,
    })
    .eq("id", obligationId)
    .in("status", ["open", "waiting_approval", "waiting_external", "scheduled_follow_up"]);

  await insertObligationEvent(admin, {
    obligationId,
    runId: runId ?? null,
    eventType: "tool_phase",
    payload: payload ?? {},
  }).catch((e) => logSilentCatch("obligation-event-tool-phase", e));
}

// ---------------------------------------------------------------------------
// Transition an obligation
// ---------------------------------------------------------------------------

export interface TransitionObligationInput {
  obligation: RuntimeObligation;
  event: ObligationTransitionEvent;
  eventType: ObligationEventType;
  runId?: string | null;
  waitingOn?: string | null;
  metadataPatch?: Record<string, unknown>;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
}

export async function transitionObligation(
  admin: SupabaseClient,
  input: TransitionObligationInput
): Promise<RuntimeObligation> {
  const { obligation, event, eventType } = input;
  const nextStatus = assertObligationTransition(obligation.status, event);
  const now = new Date().toISOString();

  // Check idempotency: if this event was already processed, return current state
  if (input.idempotencyKey) {
    const { data: existingEvent } = await admin
      .from("runtime_obligation_events")
      .select("id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingEvent) {
      return obligation;
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
    last_progress_at: now,
    metadata: {
      ...obligation.metadata,
      ...(input.metadataPatch ?? {}),
      last_transition_event: event,
      last_transition_at: now,
    },
  };

  // Status-specific fields
  if (nextStatus === "waiting_approval" || nextStatus === "waiting_external") {
    updates.waiting_on = input.waitingOn ?? null;
    updates.resume_token = generateResumeToken();
  }

  if (nextStatus === "open" && (event === "approval_granted" || event === "external_event_received" || event === "start_follow_up" || event === "retry")) {
    updates.waiting_on = null;
    updates.resume_token = null;
  }

  if (nextStatus === "scheduled_follow_up") {
    updates.continuation_count = obligation.continuation_count + 1;
    if (obligation.continuation_count + 1 >= obligation.max_continuations) {
      // Exceeded max continuations — fail instead
      const failedStatus = assertObligationTransition(obligation.status, "fail");
      updates.status = failedStatus;
      updates.metadata = {
        ...updates.metadata as Record<string, unknown>,
        failure_reason: "max_continuations_exceeded",
      };
    }
  }

  if (input.runId) {
    updates.current_run_id = input.runId;
  }

  if (isTerminalObligationStatus(nextStatus)) {
    if (nextStatus === "completed" && input.runId) {
      updates.completion_run_id = input.runId;
    }
    updates.next_check_at = null;
  }

  // Atomic update with optimistic lock on status
  const { data, error } = await admin
    .from("runtime_obligations")
    .update(updates)
    .eq("id", obligation.id)
    .eq("status", obligation.status)
    .select(OBLIGATION_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to transition obligation")
    );
  }

  if (!data) {
    throw new Error(
      `Obligation transition lost optimistic lock: ${obligation.id} (${obligation.status} + ${event})`
    );
  }

  const updated = mapObligationRow(data as unknown as Record<string, unknown>);

  // Insert event log (best-effort)
  await insertObligationEvent(admin, {
    obligationId: obligation.id,
    runId: input.runId ?? null,
    eventType,
    fromStatus: obligation.status,
    toStatus: updated.status,
    idempotencyKey: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
  }).catch((e) => logSilentCatch("obligation-event-transition", e));

  return updated;
}

// ---------------------------------------------------------------------------
// Record a heartbeat (no status change, just updates last_progress_at)
// ---------------------------------------------------------------------------

export async function recordObligationHeartbeat(
  admin: SupabaseClient,
  obligationId: string,
  runId?: string | null,
  payload?: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from("runtime_obligations")
    .update({
      last_progress_at: now,
      updated_at: now,
    })
    .eq("id", obligationId)
    .in("status", ["open", "waiting_approval", "waiting_external", "scheduled_follow_up"]);

  await insertObligationEvent(admin, {
    obligationId,
    runId: runId ?? null,
    eventType: "heartbeat",
    payload: payload ?? {},
  }).catch((e) => logSilentCatch("obligation-event-heartbeat", e));
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export async function getObligationByRunId(
  admin: SupabaseClient,
  runId: string
): Promise<RuntimeObligation | null> {
  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .or(`originating_run_id.eq.${runId},current_run_id.eq.${runId}`)
    .maybeSingle();

  return data ? mapObligationRow(data as unknown as Record<string, unknown>) : null;
}

export async function getObligationByDedupeKey(
  admin: SupabaseClient,
  dedupeKey: string
): Promise<RuntimeObligation | null> {
  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  return data ? mapObligationRow(data as unknown as Record<string, unknown>) : null;
}

export async function getObligationById(
  admin: SupabaseClient,
  id: string
): Promise<RuntimeObligation | null> {
  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  return data ? mapObligationRow(data as unknown as Record<string, unknown>) : null;
}

export async function getObligationByResumeToken(
  admin: SupabaseClient,
  token: string
): Promise<RuntimeObligation | null> {
  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .eq("resume_token", token)
    .maybeSingle();

  return data ? mapObligationRow(data as unknown as Record<string, unknown>) : null;
}

export async function listStaleObligations(
  admin: SupabaseClient,
  limit = 50
): Promise<RuntimeObligation[]> {
  const cutoff = new Date(
    Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .not("status", "in", '("completed","failed","canceled")')
    .lt("last_progress_at", cutoff)
    .order("last_progress_at", { ascending: true })
    .limit(limit);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map(
    mapObligationRow
  );
}

export async function listOverdueObligations(
  admin: SupabaseClient,
  limit = 50
): Promise<RuntimeObligation[]> {
  const now = new Date().toISOString();

  const { data } = await admin
    .from("runtime_obligations")
    .select(OBLIGATION_SELECT)
    .not("status", "in", '("completed","failed","canceled")')
    .lt("deadline_at", now)
    .order("deadline_at", { ascending: true })
    .limit(limit);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map(
    mapObligationRow
  );
}

// ---------------------------------------------------------------------------
// Status update decision: legacy helper for non-discord_runtime paths.
// discord_runtime visibility is now owned by the reply orchestrator / worker
// lifecycle flow rather than obligation-side cadence gating.
// ---------------------------------------------------------------------------

export interface StatusUpdateDecision {
  shouldUpdate: boolean;
  reason: string;
}

export function shouldSendStatusUpdate(
  obligation: RuntimeObligation,
  eventType: ObligationEventType,
  now = new Date()
): StatusUpdateDecision {
  // Always send for these high-signal events
  const alwaysSend: ObligationEventType[] = [
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "completed",
    "failed",
    "stalled",
  ];

  if (alwaysSend.includes(eventType)) {
    return { shouldUpdate: true, reason: `event_type:${eventType}` };
  }

  // Silence threshold: don't spam user with rapid progress updates
  if (obligation.last_user_update_at) {
    const lastUpdate = new Date(obligation.last_user_update_at).getTime();
    const elapsed = now.getTime() - lastUpdate;
    if (elapsed < STATUS_UPDATE_SILENCE_MS) {
      return {
        shouldUpdate: false,
        reason: `silence_threshold:${Math.round(elapsed / 1000)}s_since_last`,
      };
    }
  }

  // Progress events only if enough time has passed
  if (
    eventType === "tool_phase" ||
    eventType === "heartbeat" ||
    eventType === "progress_update_sent"
  ) {
    return { shouldUpdate: true, reason: `progress:silence_passed` };
  }

  return { shouldUpdate: false, reason: "default_suppress" };
}

// ---------------------------------------------------------------------------
// Record that we sent a user-visible update
// ---------------------------------------------------------------------------

export async function recordUserUpdate(
  admin: SupabaseClient,
  obligationId: string,
  runId?: string | null,
  payload?: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();

  await admin
    .from("runtime_obligations")
    .update({
      last_user_update_at: now,
      updated_at: now,
    })
    .eq("id", obligationId);

  await insertObligationEvent(admin, {
    obligationId,
    runId: runId ?? null,
    eventType: "progress_update_sent",
    payload: payload ?? {},
  }).catch((e) => logSilentCatch("obligation-event-progress-update", e));
}

// ---------------------------------------------------------------------------
// Closure invariant enforcement
// ---------------------------------------------------------------------------

export interface ClosureCheck {
  valid: boolean;
  reason: string;
  suggestedAction?: "schedule_follow_up" | "complete" | "fail";
}

/**
 * Checks whether a run ending should close the obligation or leave it open.
 * Enforces the invariant: a run may not end without the obligation being in
 * a terminal state or an explicit waiting/follow-up state.
 */
export function checkClosureInvariant(
  obligation: RuntimeObligation,
  runOutcome: "completed" | "failed" | "awaiting_approval"
): ClosureCheck {
  // If the run completed and the obligation is open, the obligation should complete
  if (runOutcome === "completed" && obligation.status === "open") {
    return {
      valid: false,
      reason: "run_completed_but_obligation_open",
      suggestedAction: "complete",
    };
  }

  // If the run failed and the obligation is open, the obligation should fail
  if (runOutcome === "failed" && obligation.status === "open") {
    return {
      valid: false,
      reason: "run_failed_but_obligation_open",
      suggestedAction: "fail",
    };
  }

  // If the run is awaiting approval, the obligation should be waiting_approval
  if (runOutcome === "awaiting_approval" && obligation.status === "open") {
    return {
      valid: false,
      reason: "run_awaiting_approval_but_obligation_open",
      suggestedAction: undefined, // Caller should transition to waiting_approval
    };
  }

  return { valid: true, reason: "obligation_state_consistent" };
}

// ---------------------------------------------------------------------------
// High-level lifecycle methods (for use in process-runtime-run.ts)
// ---------------------------------------------------------------------------

/**
 * Called when a run starts. Opens an obligation if appropriate.
 */
export async function onRunStarted(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<RuntimeObligation | null> {
  const obligationsEnabled = await isRuntimeObligationsEnabled(admin, run.customer_id);
  if (!obligationsEnabled) {
    return null;
  }

  if (run.run_kind === "discord_follow_up") {
    const metadataObligationId =
      typeof run.metadata?.obligation_id === "string" ? run.metadata.obligation_id : null;
    const existingById = metadataObligationId
      ? await getObligationById(admin, metadataObligationId)
      : null;
    const existingByOrigin = !existingById && typeof run.metadata?.originating_run_id === "string"
      ? await getObligationByRunId(admin, run.metadata.originating_run_id)
      : null;
    const obligation = existingById ?? existingByOrigin;

    if (!obligation || isTerminalObligationStatus(obligation.status)) {
      return obligation;
    }

    if (obligation.status === "scheduled_follow_up") {
      return transitionObligation(admin, {
        obligation,
        event: "start_follow_up",
        eventType: "follow_up_started",
        runId: run.id,
        idempotencyKey: `follow_up_started:${run.id}`,
        payload: { follow_up_run_id: run.id },
      });
    }

    if (obligation.status === "stalled") {
      return transitionObligation(admin, {
        obligation,
        event: "retry",
        eventType: "retry_scheduled",
        runId: run.id,
        idempotencyKey: `follow_up_retry:${run.id}`,
        payload: { follow_up_run_id: run.id, resumed_from: "stalled" },
      });
    }

    await recordObligationHeartbeat(admin, obligation.id, run.id, {
      run_kind: run.run_kind,
      resumed: true,
    });
    return getObligationById(admin, obligation.id);
  }

  if (!shouldCreateObligation(run)) {
    return null;
  }

  const existing = await getObligationByRunId(admin, run.id);
  if (existing && !isTerminalObligationStatus(existing.status)) {
    // Update current_run_id and record progress
    await recordObligationHeartbeat(admin, existing.id, run.id);
    return existing;
  }

  const payload = run.payload;
  return openObligation(admin, {
    run,
    channelId: typeof payload.channel_id === "string" ? payload.channel_id : null,
    replyToMessageId:
      typeof payload.message_id === "string" ? payload.message_id : null,
    dedupeKey: run.idempotency_key
      ? `obligation:${run.idempotency_key}`
      : null,
  });
}

/**
 * Called when a run completes. Closes the obligation.
 */
export async function onRunCompleted(
  admin: SupabaseClient,
  run: TenantRuntimeRun
): Promise<RuntimeObligation | null> {
  if (!(await isRuntimeObligationsEnabled(admin, run.customer_id))) {
    return null;
  }
  const obligation = await getObligationByRunId(admin, run.id);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "complete",
    eventType: "completed",
    runId: run.id,
    idempotencyKey: `complete:${run.id}`,
  });
}

/**
 * Called when a run fails. Fails the obligation.
 */
export async function onRunFailed(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  errorMessage?: string
): Promise<RuntimeObligation | null> {
  if (!(await isRuntimeObligationsEnabled(admin, run.customer_id))) {
    return null;
  }
  const obligation = await getObligationByRunId(admin, run.id);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "fail",
    eventType: "failed",
    runId: run.id,
    idempotencyKey: `fail:${run.id}`,
    payload: errorMessage ? { error: errorMessage } : {},
  });
}

/**
 * Called when a run requests approval. Transitions to waiting_approval.
 */
export async function onApprovalRequested(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  approvalId: string
): Promise<RuntimeObligation | null> {
  if (!(await isRuntimeObligationsEnabled(admin, run.customer_id))) {
    return null;
  }
  const obligation = await getObligationByRunId(admin, run.id);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "request_approval",
    eventType: "approval_requested",
    runId: run.id,
    waitingOn: `approval:${approvalId}`,
    idempotencyKey: `approval_req:${run.id}:${approvalId}`,
    payload: { approval_id: approvalId },
  });
}

/**
 * Called when approval is granted. Resumes the obligation.
 */
export async function onApprovalGranted(
  admin: SupabaseClient,
  obligationId: string,
  approvalId: string,
  resumeRunId: string
): Promise<RuntimeObligation | null> {
  const obligation = await getObligationById(admin, obligationId);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "approval_granted",
    eventType: "approval_granted",
    runId: resumeRunId,
    idempotencyKey: `approval_grant:${approvalId}`,
    payload: { approval_id: approvalId, resume_run_id: resumeRunId },
  });
}

/**
 * Called when a follow-up run is scheduled for this obligation.
 */
export async function onFollowUpScheduled(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  followUpRunId: string
): Promise<RuntimeObligation | null> {
  if (!(await isRuntimeObligationsEnabled(admin, run.customer_id))) {
    return null;
  }
  const obligation = await getObligationByRunId(admin, run.id);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "schedule_follow_up",
    eventType: "follow_up_scheduled",
    runId: followUpRunId,
    idempotencyKey: `follow_up:${followUpRunId}`,
    payload: { follow_up_run_id: followUpRunId },
  });
}

export async function onFollowUpScheduledForRunId(
  admin: SupabaseClient,
  customerId: string,
  runId: string,
  followUpRunId: string
): Promise<RuntimeObligation | null> {
  if (!(await isRuntimeObligationsEnabled(admin, customerId))) {
    return null;
  }
  const obligation = await getObligationByRunId(admin, runId);
  if (!obligation || isTerminalObligationStatus(obligation.status)) {
    return obligation;
  }

  return transitionObligation(admin, {
    obligation,
    event: "schedule_follow_up",
    eventType: "follow_up_scheduled",
    runId: followUpRunId,
    idempotencyKey: `follow_up:${followUpRunId}`,
    payload: { follow_up_run_id: followUpRunId },
  });
}

// ---------------------------------------------------------------------------
// Event log insertion (internal)
// ---------------------------------------------------------------------------

async function insertObligationEvent(
  admin: SupabaseClient,
  input: {
    obligationId: string;
    runId?: string | null;
    eventType: ObligationEventType;
    fromStatus?: string | null;
    toStatus?: string | null;
    idempotencyKey?: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  await admin.from("runtime_obligation_events").insert({
    obligation_id: input.obligationId,
    run_id: input.runId ?? null,
    event_type: input.eventType,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    idempotency_key: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
  });
}

export async function bindApprovalToObligation(
  admin: SupabaseClient,
  approvalId: string,
  obligation: RuntimeObligation
): Promise<void> {
  const { data: approvalRow } = await admin
    .from("tenant_approvals")
    .select("request_payload")
    .eq("id", approvalId)
    .maybeSingle();

  const requestPayload =
    approvalRow?.request_payload &&
    typeof approvalRow.request_payload === "object" &&
    !Array.isArray(approvalRow.request_payload)
      ? (approvalRow.request_payload as Record<string, unknown>)
      : {};

  await admin
    .from("tenant_approvals")
    .update({
      request_payload: {
        ...requestPayload,
        obligation_id: obligation.id,
        obligation_resume_token: obligation.resume_token,
      },
    })
    .eq("id", approvalId);
}
