// ---------------------------------------------------------------------------
// Runtime Obligations — durable state machine for user-facing task tracking
// ---------------------------------------------------------------------------

export const OBLIGATION_STATUS_VALUES = [
  "open",
  "waiting_approval",
  "waiting_external",
  "scheduled_follow_up",
  "stalled",
  "completed",
  "failed",
  "canceled",
] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUS_VALUES)[number];

export const OBLIGATION_TERMINAL_STATUSES: readonly ObligationStatus[] = [
  "completed",
  "failed",
  "canceled",
];

export const OBLIGATION_EVENT_TYPE_VALUES = [
  "created",
  "run_started",
  "tool_phase",
  "progress_update_sent",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "external_wait_started",
  "external_event_received",
  "follow_up_scheduled",
  "follow_up_started",
  "heartbeat",
  "stalled",
  "retry_scheduled",
  "completed",
  "failed",
  "canceled",
] as const;
export type ObligationEventType = (typeof OBLIGATION_EVENT_TYPE_VALUES)[number];

export interface RuntimeObligation {
  id: string;
  tenant_id: string;
  customer_id: string;

  // Context
  session_id: string | null;
  channel_id: string | null;
  reply_to_message_id: string | null;
  agent_id: string | null;

  // Run linkage
  originating_run_id: string;
  current_run_id: string | null;
  completion_run_id: string | null;

  // State
  status: ObligationStatus;
  waiting_on: string | null;
  resume_token: string | null;

  // Timing
  next_check_at: string | null;
  last_progress_at: string;
  last_user_update_at: string | null;
  deadline_at: string | null;

  // Continuation
  continuation_count: number;
  max_continuations: number;

  // Dedup
  dedupe_key: string | null;

  // Observability
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface RuntimeObligationEvent {
  id: string;
  obligation_id: string;
  run_id: string | null;
  event_type: ObligationEventType;
  from_status: string | null;
  to_status: string | null;
  idempotency_key: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}
