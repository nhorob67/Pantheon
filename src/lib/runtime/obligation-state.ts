// ---------------------------------------------------------------------------
// Obligation State Machine
// ---------------------------------------------------------------------------
// Defines valid status transitions for runtime obligations.
// Follows the same pattern as tenant-runtime-run-state.ts.

import type { ObligationStatus } from "@/types/obligation";

export type ObligationTransitionEvent =
  | "start_work"
  | "request_approval"
  | "approval_granted"
  | "approval_rejected"
  | "start_external_wait"
  | "external_event_received"
  | "schedule_follow_up"
  | "start_follow_up"
  | "heartbeat"
  | "stall"
  | "retry"
  | "complete"
  | "fail"
  | "cancel";

const TRANSITIONS: Record<
  ObligationStatus,
  Partial<Record<ObligationTransitionEvent, ObligationStatus>>
> = {
  open: {
    request_approval: "waiting_approval",
    start_external_wait: "waiting_external",
    schedule_follow_up: "scheduled_follow_up",
    heartbeat: "open",
    stall: "stalled",
    complete: "completed",
    fail: "failed",
    cancel: "canceled",
  },
  waiting_approval: {
    approval_granted: "open",
    approval_rejected: "failed",
    stall: "stalled",
    cancel: "canceled",
    fail: "failed",
  },
  waiting_external: {
    external_event_received: "open",
    stall: "stalled",
    cancel: "canceled",
    fail: "failed",
  },
  scheduled_follow_up: {
    start_follow_up: "open",
    stall: "stalled",
    cancel: "canceled",
    fail: "failed",
  },
  stalled: {
    retry: "open",
    fail: "failed",
    cancel: "canceled",
  },
  completed: {},
  failed: {},
  canceled: {},
};

export function transitionObligationState(
  current: ObligationStatus,
  event: ObligationTransitionEvent
): ObligationStatus | null {
  return TRANSITIONS[current]?.[event] ?? null;
}

export function assertObligationTransition(
  current: ObligationStatus,
  event: ObligationTransitionEvent
): ObligationStatus {
  const next = transitionObligationState(current, event);
  if (!next) {
    throw new Error(
      `Invalid obligation transition: ${current} + ${event}`
    );
  }
  return next;
}

export function isTerminalObligationStatus(status: ObligationStatus): boolean {
  return status === "completed" || status === "failed" || status === "canceled";
}
