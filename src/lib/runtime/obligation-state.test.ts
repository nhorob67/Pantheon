import assert from "node:assert/strict";
import test from "node:test";
import {
  transitionObligationState,
  assertObligationTransition,
  isTerminalObligationStatus,
} from "./obligation-state.ts";

// ---------------------------------------------------------------------------
// Happy path: full lifecycle
// ---------------------------------------------------------------------------

test("obligation state machine: open → complete", () => {
  assert.equal(transitionObligationState("open", "complete"), "completed");
});

test("obligation state machine: open → approval → granted → complete", () => {
  assert.equal(transitionObligationState("open", "request_approval"), "waiting_approval");
  assert.equal(transitionObligationState("waiting_approval", "approval_granted"), "open");
  assert.equal(transitionObligationState("open", "complete"), "completed");
});

test("obligation state machine: open → external wait → received → complete", () => {
  assert.equal(transitionObligationState("open", "start_external_wait"), "waiting_external");
  assert.equal(transitionObligationState("waiting_external", "external_event_received"), "open");
  assert.equal(transitionObligationState("open", "complete"), "completed");
});

test("obligation state machine: open → follow-up → start follow-up → complete", () => {
  assert.equal(transitionObligationState("open", "schedule_follow_up"), "scheduled_follow_up");
  assert.equal(transitionObligationState("scheduled_follow_up", "start_follow_up"), "open");
  assert.equal(transitionObligationState("open", "complete"), "completed");
});

// ---------------------------------------------------------------------------
// Stall and retry
// ---------------------------------------------------------------------------

test("obligation state machine: open → stall → retry → complete", () => {
  assert.equal(transitionObligationState("open", "stall"), "stalled");
  assert.equal(transitionObligationState("stalled", "retry"), "open");
  assert.equal(transitionObligationState("open", "complete"), "completed");
});

test("obligation state machine: stalled → fail (second stall)", () => {
  assert.equal(transitionObligationState("stalled", "fail"), "failed");
});

test("obligation state machine: waiting_approval → stall (timeout)", () => {
  assert.equal(transitionObligationState("waiting_approval", "stall"), "stalled");
});

test("obligation state machine: waiting_external → stall (timeout)", () => {
  assert.equal(transitionObligationState("waiting_external", "stall"), "stalled");
});

test("obligation state machine: scheduled_follow_up → stall (never started)", () => {
  assert.equal(transitionObligationState("scheduled_follow_up", "stall"), "stalled");
});

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

test("obligation state machine: open → fail", () => {
  assert.equal(transitionObligationState("open", "fail"), "failed");
});

test("obligation state machine: approval rejected → failed", () => {
  assert.equal(transitionObligationState("waiting_approval", "approval_rejected"), "failed");
});

test("obligation state machine: cancel from any non-terminal state", () => {
  assert.equal(transitionObligationState("open", "cancel"), "canceled");
  assert.equal(transitionObligationState("waiting_approval", "cancel"), "canceled");
  assert.equal(transitionObligationState("waiting_external", "cancel"), "canceled");
  assert.equal(transitionObligationState("scheduled_follow_up", "cancel"), "canceled");
  assert.equal(transitionObligationState("stalled", "cancel"), "canceled");
});

// ---------------------------------------------------------------------------
// Heartbeat (stays in same state)
// ---------------------------------------------------------------------------

test("obligation state machine: heartbeat keeps open state", () => {
  assert.equal(transitionObligationState("open", "heartbeat"), "open");
});

// ---------------------------------------------------------------------------
// Terminal states reject all events
// ---------------------------------------------------------------------------

test("obligation state machine: terminal states reject all events", () => {
  const terminalStates = ["completed", "failed", "canceled"] as const;
  const events = [
    "start_work",
    "request_approval",
    "approval_granted",
    "complete",
    "fail",
    "cancel",
    "heartbeat",
  ] as const;

  for (const status of terminalStates) {
    for (const event of events) {
      assert.equal(
        transitionObligationState(status, event),
        null,
        `${status} + ${event} should be null`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Invalid transitions
// ---------------------------------------------------------------------------

test("obligation state machine: rejects invalid transitions", () => {
  // Can't approve from open
  assert.equal(transitionObligationState("open", "approval_granted"), null);
  // Can't receive external event from open
  assert.equal(transitionObligationState("open", "external_event_received"), null);
  // Can't start follow-up from open
  assert.equal(transitionObligationState("open", "start_follow_up"), null);
  // Can't retry from open (retry is only from stalled)
  assert.equal(transitionObligationState("open", "retry"), null);
});

test("assertObligationTransition throws on invalid transition", () => {
  assert.throws(
    () => assertObligationTransition("completed", "complete"),
    /Invalid obligation transition/
  );
});

// ---------------------------------------------------------------------------
// isTerminalObligationStatus
// ---------------------------------------------------------------------------

test("isTerminalObligationStatus identifies terminal states", () => {
  assert.equal(isTerminalObligationStatus("completed"), true);
  assert.equal(isTerminalObligationStatus("failed"), true);
  assert.equal(isTerminalObligationStatus("canceled"), true);
  assert.equal(isTerminalObligationStatus("open"), false);
  assert.equal(isTerminalObligationStatus("waiting_approval"), false);
  assert.equal(isTerminalObligationStatus("waiting_external"), false);
  assert.equal(isTerminalObligationStatus("scheduled_follow_up"), false);
  assert.equal(isTerminalObligationStatus("stalled"), false);
});
