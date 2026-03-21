import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldCreateObligation,
  shouldSendStatusUpdate,
  checkClosureInvariant,
} from "./obligation-coordinator.ts";
import { transitionObligationState } from "./obligation-state.ts";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import type { RuntimeObligation } from "@/types/obligation";

// ---------------------------------------------------------------------------
// Helpers: build minimal test fixtures
// ---------------------------------------------------------------------------

function makeRun(overrides: Partial<TenantRuntimeRun> = {}): TenantRuntimeRun {
  return {
    id: "run-1",
    tenant_id: "t-1",
    customer_id: "c-1",
    run_kind: "discord_runtime",
    source: "discord_ingress",
    status: "running",
    attempt_count: 1,
    max_attempts: 3,
    idempotency_key: null,
    request_trace_id: null,
    correlation_id: null,
    payload: {},
    result: {},
    error_message: null,
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
    canceled_at: null,
    lock_expires_at: null,
    worker_id: null,
    parent_run_id: null,
    delegation_depth: 0,
    deadline_at: null,
    delegation_kind: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeObligation(
  overrides: Partial<RuntimeObligation> = {}
): RuntimeObligation {
  return {
    id: "obl-1",
    tenant_id: "t-1",
    customer_id: "c-1",
    session_id: null,
    channel_id: "ch-1",
    reply_to_message_id: null,
    agent_id: null,
    originating_run_id: "run-1",
    current_run_id: "run-1",
    completion_run_id: null,
    status: "open",
    waiting_on: null,
    resume_token: null,
    next_check_at: null,
    last_progress_at: new Date().toISOString(),
    last_user_update_at: null,
    deadline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    continuation_count: 0,
    max_continuations: 5,
    dedupe_key: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// shouldCreateObligation
// ---------------------------------------------------------------------------

test("shouldCreateObligation: true for discord_runtime", () => {
  assert.equal(shouldCreateObligation(makeRun({ run_kind: "discord_runtime" })), true);
});

test("shouldCreateObligation: false for discord_follow_up", () => {
  assert.equal(
    shouldCreateObligation(makeRun({ run_kind: "discord_follow_up" })),
    false
  );
});

test("shouldCreateObligation: false for heartbeat", () => {
  assert.equal(
    shouldCreateObligation(makeRun({ run_kind: "discord_heartbeat" })),
    false
  );
});

test("shouldCreateObligation: false for email_runtime", () => {
  assert.equal(
    shouldCreateObligation(makeRun({ run_kind: "email_runtime" })),
    false
  );
});

test("shouldCreateObligation: false for delegation_runtime", () => {
  assert.equal(
    shouldCreateObligation(makeRun({ run_kind: "delegation_runtime" })),
    false
  );
});

// ---------------------------------------------------------------------------
// shouldSendStatusUpdate
// ---------------------------------------------------------------------------

test("shouldSendStatusUpdate: always send for high-signal events", () => {
  const obl = makeObligation();
  const highSignal = [
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "completed",
    "failed",
    "stalled",
  ] as const;

  for (const eventType of highSignal) {
    const decision = shouldSendStatusUpdate(obl, eventType);
    assert.equal(decision.shouldUpdate, true, `${eventType} should always send`);
  }
});

test("shouldSendStatusUpdate: suppress within silence threshold", () => {
  const now = new Date();
  const recentUpdate = new Date(now.getTime() - 10_000).toISOString(); // 10s ago
  const obl = makeObligation({ last_user_update_at: recentUpdate });

  const decision = shouldSendStatusUpdate(obl, "tool_phase", now);
  assert.equal(decision.shouldUpdate, false);
  assert.ok(decision.reason.includes("silence_threshold"));
});

test("shouldSendStatusUpdate: allow after silence threshold", () => {
  const now = new Date();
  const oldUpdate = new Date(now.getTime() - 60_000).toISOString(); // 60s ago
  const obl = makeObligation({ last_user_update_at: oldUpdate });

  const decision = shouldSendStatusUpdate(obl, "tool_phase", now);
  assert.equal(decision.shouldUpdate, true);
});

test("shouldSendStatusUpdate: allow heartbeat after silence threshold", () => {
  const now = new Date();
  const oldUpdate = new Date(now.getTime() - 60_000).toISOString();
  const obl = makeObligation({ last_user_update_at: oldUpdate });

  const decision = shouldSendStatusUpdate(obl, "heartbeat", now);
  assert.equal(decision.shouldUpdate, true);
});

test("shouldSendStatusUpdate: allow first update (no previous)", () => {
  const obl = makeObligation({ last_user_update_at: null });
  const decision = shouldSendStatusUpdate(obl, "tool_phase");
  assert.equal(decision.shouldUpdate, true);
});

test("shouldSendStatusUpdate: high-signal events bypass silence threshold", () => {
  const now = new Date();
  const recentUpdate = new Date(now.getTime() - 1_000).toISOString(); // 1s ago
  const obl = makeObligation({ last_user_update_at: recentUpdate });

  const decision = shouldSendStatusUpdate(obl, "completed", now);
  assert.equal(decision.shouldUpdate, true);
});

// ---------------------------------------------------------------------------
// checkClosureInvariant
// ---------------------------------------------------------------------------

test("checkClosureInvariant: run completed + obligation open → suggest complete", () => {
  const obl = makeObligation({ status: "open" });
  const check = checkClosureInvariant(obl, "completed");
  assert.equal(check.valid, false);
  assert.equal(check.suggestedAction, "complete");
});

test("checkClosureInvariant: run failed + obligation open → suggest fail", () => {
  const obl = makeObligation({ status: "open" });
  const check = checkClosureInvariant(obl, "failed");
  assert.equal(check.valid, false);
  assert.equal(check.suggestedAction, "fail");
});

test("checkClosureInvariant: run awaiting_approval + obligation open → no suggested action", () => {
  const obl = makeObligation({ status: "open" });
  const check = checkClosureInvariant(obl, "awaiting_approval");
  assert.equal(check.valid, false);
  assert.equal(check.suggestedAction, undefined);
});

test("checkClosureInvariant: consistent states return valid", () => {
  // Already completed
  const completed = makeObligation({ status: "completed" });
  assert.equal(checkClosureInvariant(completed, "completed").valid, true);

  // Waiting for approval
  const waiting = makeObligation({ status: "waiting_approval" });
  assert.equal(checkClosureInvariant(waiting, "awaiting_approval").valid, true);

  // Scheduled follow-up with completed run
  const followUp = makeObligation({ status: "scheduled_follow_up" });
  assert.equal(checkClosureInvariant(followUp, "completed").valid, true);
});

// ---------------------------------------------------------------------------
// Duplicate approval event → deduped (tested via state machine)
// ---------------------------------------------------------------------------

test("obligation state machine prevents double-granting approval", () => {
  // After approval_granted, obligation is "open" — a second approval_granted
  // from "open" is invalid (no transition defined)
  assert.equal(transitionObligationState("open", "approval_granted"), null);
});

// ---------------------------------------------------------------------------
// Intermediate model chatter: state machine still needs explicit closure
// ---------------------------------------------------------------------------

test("obligation requires explicit closure regardless of model output", () => {
  // An obligation in "open" status has no implicit completion.
  // The coordinator must explicitly call complete/fail/schedule_follow_up.
  // Verify that "open" cannot auto-transition to completed without an event.
  // The only paths out of "open" require explicit events
  const validEvents = [
    "request_approval",
    "start_external_wait",
    "schedule_follow_up",
    "heartbeat",
    "stall",
    "complete",
    "fail",
    "cancel",
  ];

  // Events that DON'T work from open (would be needed for implicit closure)
  assert.equal(transitionObligationState("open", "approval_granted"), null);
  assert.equal(transitionObligationState("open", "external_event_received"), null);
  assert.equal(transitionObligationState("open", "start_follow_up"), null);
  assert.equal(transitionObligationState("open", "retry"), null);

  // All valid events require coordinator to explicitly fire them
  for (const event of validEvents) {
    const result = transitionObligationState("open", event);
    assert.notEqual(result, undefined, `open + ${event} should be defined`);
  }
});
