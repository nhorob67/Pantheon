export interface HeartbeatChecks {
  unanswered_emails: boolean;
  unanswered_emails_threshold_hours: number;
}

export type HeartbeatTriggerMode =
  | "scheduled"
  | "manual_run"
  | "manual_preview"
  | "manual_test";

export type HeartbeatIssueState =
  | "new"
  | "acknowledged"
  | "snoozed"
  | "resolved";

export type HeartbeatIssueAttentionType =
  | "new_issue"
  | "reminder"
  | "worsened";

export type HeartbeatDeliveryStatus =
  | "not_applicable"
  | "suppressed"
  | "deferred"
  | "awaiting_approval"
  | "queued"
  | "dispatched"
  | "dispatch_failed"
  | "preview";

export interface HeartbeatConfig {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  enabled: boolean;
  interval_minutes: number;
  timezone: string;
  active_hours_start: string;
  active_hours_end: string;
  checks: HeartbeatChecks;
  custom_checks: string[];
  delivery_channel_id: string | null;
  cooldown_minutes: number;
  max_alerts_per_day: number;
  digest_enabled: boolean;
  digest_window_minutes: number;
  reminder_interval_minutes: number;
  heartbeat_instructions: string;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatIssue {
  id: string;
  tenant_id: string;
  config_id: string;
  customer_id: string;
  agent_id: string | null;
  signal_type: string;
  fingerprint: string;
  severity: number;
  state: HeartbeatIssueState;
  summary: string | null;
  payload: unknown;
  first_seen_at: string;
  last_seen_at: string;
  last_notified_at: string | null;
  last_notification_kind: HeartbeatIssueAttentionType | null;
  snoozed_until: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatRun {
  id: string;
  config_id: string;
  tenant_id: string;
  ran_at: string;
  run_slot: string | null;
  trigger_mode: HeartbeatTriggerMode;
  checks_executed: Record<string, CheapCheckResult>;
  check_durations: Record<string, number>;
  signal_fingerprints: string[];
  had_signal: boolean;
  llm_invoked: boolean;
  delivery_attempted: boolean;
  delivery_status: HeartbeatDeliveryStatus;
  suppressed_reason: string | null;
  decision_trace: Record<string, unknown>;
  freshness_metadata: Record<string, unknown>;
  dispatch_metadata: Record<string, unknown>;
  runtime_run_id: string | null;
  tokens_used: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface CheapCheckResult {
  status: "ok" | "alert" | "error";
  summary?: string;
  data?: unknown;
  observability?: Record<string, unknown>;
}

export interface HeartbeatActivity {
  config: HeartbeatConfig;
  dayBuckets: import("@/lib/queries/schedule-activity").DayBucket[];
  recentRuns: HeartbeatRun[];
  activeIssues: HeartbeatIssue[];
}

export interface HeartbeatBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface HeartbeatAnalytics {
  delivery_breakdown: HeartbeatBreakdownItem[];
  signal_breakdown: HeartbeatBreakdownItem[];
  suppression_breakdown: HeartbeatBreakdownItem[];
  defer_breakdown: HeartbeatBreakdownItem[];
  issue_age_breakdown: HeartbeatBreakdownItem[];
  guardrail_breakdown: HeartbeatBreakdownItem[];
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
  avg_tokens_per_llm_run: number | null;
  runs_with_guardrail_blocks: number;
}

export interface HeartbeatStats {
  today_runs: number;
  today_signals: number;
  today_notifications: number;
  today_suppressed: number;
  today_deferred: number;
  today_awaiting_approval: number;
  today_llm_invocations: number;
  today_tokens: number;
  active_issues: number;
}

export type HeartbeatOperatorEventType =
  | "config_saved"
  | "paused"
  | "resumed"
  | "manual_preview"
  | "manual_run"
  | "manual_test"
  | "issue_acknowledged"
  | "issue_snoozed"
  | "issue_resolved";

export interface HeartbeatOperatorEvent {
  id: string;
  tenant_id: string;
  config_id: string | null;
  customer_id: string;
  agent_id: string | null;
  actor_user_id: string | null;
  event_type: HeartbeatOperatorEventType;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HeartbeatSeriesPoint {
  date: string;
  value: number;
}

export interface HeartbeatSeries {
  key: string;
  label: string;
  points: HeartbeatSeriesPoint[];
}

export interface HeartbeatRunsReport {
  runs: HeartbeatRun[];
  total: number;
  page: number;
  page_size: number;
  available_signal_types: string[];
}

export type HeartbeatAuditItemKind =
  | "operator_event"
  | "manual_preview"
  | "manual_run"
  | "manual_test"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected";

export interface HeartbeatAuditItem {
  id: string;
  occurred_at: string;
  kind: HeartbeatAuditItemKind;
  config_id: string | null;
  agent_id: string | null;
  title: string;
  summary: string;
  status: string | null;
  actor_user_id: string | null;
  related_run_id: string | null;
  related_approval_id: string | null;
  metadata: Record<string, unknown>;
}

export interface HeartbeatAuditReport {
  items: HeartbeatAuditItem[];
  total: number;
  page: number;
  page_size: number;
  kind_breakdown: HeartbeatBreakdownItem[];
}

export interface HeartbeatTrendsReport {
  total_runs: number;
  window: {
    date_from: string | null;
    date_to: string | null;
  };
  delivery_series: HeartbeatSeries[];
  signal_series: HeartbeatSeries[];
  approval_series: HeartbeatSeries[];
  latency_series: HeartbeatSeries[];
  token_series: HeartbeatSeries[];
  analytics: HeartbeatAnalytics;
  approval_breakdown: HeartbeatBreakdownItem[];
  manual_action_breakdown: HeartbeatBreakdownItem[];
}
