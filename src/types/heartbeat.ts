export interface HeartbeatChecks {
  weather_severe: boolean;
  grain_price_movement: boolean;
  grain_price_threshold_cents: number;
  unreviewed_tickets: boolean;
  unreviewed_tickets_threshold_hours: number;
  unanswered_emails: boolean;
  unanswered_emails_threshold_hours: number;
}

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
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatRun {
  id: string;
  config_id: string;
  tenant_id: string;
  ran_at: string;
  checks_executed: Record<string, CheapCheckResult>;
  had_signal: boolean;
  llm_invoked: boolean;
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
}

export interface HeartbeatActivity {
  config: HeartbeatConfig;
  dayBuckets: import("@/lib/queries/schedule-activity").DayBucket[];
  recentRuns: HeartbeatRun[];
}

export interface HeartbeatStats {
  today_runs: number;
  today_signals: number;
  today_llm_invocations: number;
  today_tokens: number;
}
