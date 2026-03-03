import type { TenantRuntimeRunStatus } from "@/types/tenant-runtime";

export type TenantRuntimeRunTransitionEvent =
  | "start"
  | "request_approval"
  | "resume_after_approval"
  | "complete"
  | "fail"
  | "cancel"
  | "retry";

const TRANSITIONS: Record<
  TenantRuntimeRunStatus,
  Partial<Record<TenantRuntimeRunTransitionEvent, TenantRuntimeRunStatus>>
> = {
  queued: {
    start: "running",
    cancel: "canceled",
  },
  running: {
    request_approval: "awaiting_approval",
    complete: "completed",
    fail: "failed",
    cancel: "canceled",
  },
  awaiting_approval: {
    resume_after_approval: "running",
    retry: "queued",
    fail: "failed",
    cancel: "canceled",
  },
  completed: {},
  failed: {
    retry: "queued",
    cancel: "canceled",
  },
  canceled: {},
};

export function transitionTenantRuntimeRunState(
  current: TenantRuntimeRunStatus,
  event: TenantRuntimeRunTransitionEvent
): TenantRuntimeRunStatus | null {
  return TRANSITIONS[current][event] || null;
}

export function assertTenantRuntimeRunTransition(
  current: TenantRuntimeRunStatus,
  event: TenantRuntimeRunTransitionEvent
): TenantRuntimeRunStatus {
  const next = transitionTenantRuntimeRunState(current, event);
  if (!next) {
    throw new Error(`Invalid tenant runtime run transition: ${current} -> ${event}`);
  }
  return next;
}
