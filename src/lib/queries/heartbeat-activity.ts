import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayBucket } from "./schedule-activity";
import type {
  HeartbeatAnalytics,
  HeartbeatBreakdownItem,
  HeartbeatConfig,
  HeartbeatIssue,
  HeartbeatOperatorEvent,
  HeartbeatRun,
  HeartbeatStats,
} from "@/types/heartbeat";

function buildEmptyBuckets(): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, total: 0, succeeded: 0, failed: 0 });
  }
  return map;
}

function bucketDate(isoTimestamp: string, timezone: string): string {
  try {
    const d = new Date(isoTimestamp);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return isoTimestamp.slice(0, 10);
  }
}

export interface HeartbeatActivityData {
  configs: HeartbeatConfig[];
  dayBuckets: DayBucket[];
  recentRuns: HeartbeatRun[];
  activeIssues: HeartbeatIssue[];
  recentEvents: HeartbeatOperatorEvent[];
  recentManualTests: HeartbeatRun[];
  configStats: {
    config_id: string;
    recent_deliveries_24h: number;
    recent_suppressed_24h: number;
    active_issue_count: number;
    last_run_at: string | null;
    last_delivery_status: HeartbeatRun["delivery_status"] | null;
  }[];
  stats: HeartbeatStats;
  analytics: HeartbeatAnalytics;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function formatBreakdownLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function buildBreakdown(
  map: Map<string, number>,
  limit = 6
): HeartbeatBreakdownItem[] {
  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({
      key,
      label: formatBreakdownLabel(key),
      count,
    }));
}

function incrementCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

function extractSignalTypes(run: HeartbeatRun): string[] {
  const decisionTrace = asRecord(run.decision_trace);
  const selected = asStringArray(decisionTrace.selected_signal_types);
  if (selected.length > 0) {
    return selected;
  }

  return asStringArray(decisionTrace.signal_types);
}

function extractGuardrailReason(run: HeartbeatRun): string | null {
  if (typeof run.suppressed_reason === "string" && run.suppressed_reason.startsWith("guardrail_")) {
    return run.suppressed_reason;
  }

  const guardrail = asRecord(asRecord(run.dispatch_metadata).guardrail_ref);
  if (guardrail.blocked === true && typeof guardrail.stage === "string") {
    return `guardrail_${guardrail.stage}_blocked`;
  }

  return null;
}

function percentile(values: number[], value: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((value / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? null;
}

export function buildHeartbeatAnalytics(
  runs: HeartbeatRun[],
  activeIssues: HeartbeatIssue[]
): HeartbeatAnalytics {
  const deliveryBreakdown = new Map<string, number>();
  const signalBreakdown = new Map<string, number>();
  const suppressionBreakdown = new Map<string, number>();
  const deferBreakdown = new Map<string, number>();
  const issueAgeBreakdown = new Map<string, number>();
  const guardrailBreakdown = new Map<string, number>();
  const durations = runs
    .map((run) => run.duration_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const llmRuns = runs.filter((run) => run.llm_invoked);
  const nowMs = Date.now();

  for (const run of runs) {
    incrementCount(deliveryBreakdown, run.delivery_status);

    for (const signalType of extractSignalTypes(run)) {
      incrementCount(signalBreakdown, signalType);
    }

    if (run.delivery_status === "suppressed" && run.suppressed_reason) {
      incrementCount(suppressionBreakdown, run.suppressed_reason);
    }

    if (run.delivery_status === "deferred" && run.suppressed_reason) {
      incrementCount(deferBreakdown, run.suppressed_reason);
    }

    const guardrailReason = extractGuardrailReason(run);
    if (guardrailReason) {
      incrementCount(guardrailBreakdown, guardrailReason);
    }
  }

  for (const issue of activeIssues) {
    const ageMs = Math.max(0, nowMs - Date.parse(issue.first_seen_at));
    const ageHours = ageMs / (60 * 60 * 1000);
    const bucket = ageHours < 24
      ? "under_24h"
      : ageHours < 72
        ? "1_to_3d"
        : ageHours < 168
          ? "3_to_7d"
          : "7d_plus";
    incrementCount(issueAgeBreakdown, bucket);
  }

  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : null;
  const avgTokensPerLlmRun = llmRuns.length > 0
    ? Math.round(
        llmRuns.reduce((sum, run) => sum + (run.tokens_used || 0), 0) / llmRuns.length
      )
    : null;

  return {
    delivery_breakdown: buildBreakdown(deliveryBreakdown, 8),
    signal_breakdown: buildBreakdown(signalBreakdown, 8),
    suppression_breakdown: buildBreakdown(suppressionBreakdown, 8),
    defer_breakdown: buildBreakdown(deferBreakdown, 8),
    issue_age_breakdown: buildBreakdown(issueAgeBreakdown, 4),
    guardrail_breakdown: buildBreakdown(guardrailBreakdown, 4),
    avg_duration_ms: avgDurationMs,
    p95_duration_ms: percentile(durations, 95),
    avg_tokens_per_llm_run: avgTokensPerLlmRun,
    runs_with_guardrail_blocks: Array.from(guardrailBreakdown.values()).reduce(
      (sum, count) => sum + count,
      0
    ),
  };
}

export async function fetchHeartbeatActivity(
  admin: SupabaseClient,
  tenantId: string
): Promise<HeartbeatActivityData> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [configsResult, runsResult, issuesResult, eventsResult] = await Promise.all([
    admin
      .from("tenant_heartbeat_configs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("agent_id", { ascending: true, nullsFirst: true }),
    admin
      .from("tenant_heartbeat_runs")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", fourteenDaysAgo)
      .order("ran_at", { ascending: false })
      .limit(500),
    admin
      .from("tenant_heartbeat_signals")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("resolved_at", null)
      .order("severity", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(100),
    admin
      .from("tenant_heartbeat_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const configs = (configsResult.data || []) as HeartbeatConfig[];
  const runs = (runsResult.data || []) as HeartbeatRun[];
  const activeIssues = (issuesResult.data || []) as HeartbeatIssue[];
  const recentEvents = (eventsResult.data || []) as HeartbeatOperatorEvent[];
  const recentManualTests = runs.filter((run) => run.trigger_mode === "manual_test").slice(0, 10);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const configStats = configs.map((config) => {
    const configRuns = runs.filter((run) => run.config_id === config.id);
    const recentRuns = configRuns.filter(
      (run) => Date.parse(run.ran_at) >= dayAgo
    );
    return {
      config_id: config.id,
      recent_deliveries_24h: recentRuns.filter((run) =>
        run.delivery_status === "queued" || run.delivery_status === "dispatched"
      ).length,
      recent_suppressed_24h: recentRuns.filter(
        (run) =>
          run.delivery_status === "suppressed"
          || run.delivery_status === "deferred"
          || run.delivery_status === "awaiting_approval"
      ).length,
      active_issue_count: activeIssues.filter((issue) => issue.config_id === config.id).length,
      last_run_at: configRuns[0]?.ran_at ?? null,
      last_delivery_status: configRuns[0]?.delivery_status ?? null,
    };
  });

  // Build 14-day buckets
  const defaultTz = configs[0]?.timezone || "America/Chicago";
  const buckets = buildEmptyBuckets();
  for (const run of runs) {
    const dateKey = bucketDate(run.ran_at, defaultTz);
    const bucket = buckets.get(dateKey);
    if (bucket) {
      bucket.total++;
      if (!run.error_message) bucket.succeeded++;
      else bucket.failed++;
    }
  }

  // Today's stats
  const todayRuns = runs.filter(
    (r) => new Date(r.ran_at) >= todayStart
  );

  const stats: HeartbeatStats = {
    today_runs: todayRuns.length,
    today_signals: todayRuns.filter((r) => r.had_signal).length,
    today_notifications: todayRuns.filter((r) =>
      r.delivery_status === "queued" || r.delivery_status === "dispatched"
    ).length,
    today_suppressed: todayRuns.filter((r) => r.delivery_status === "suppressed").length,
    today_deferred: todayRuns.filter((r) => r.delivery_status === "deferred").length,
    today_awaiting_approval: todayRuns.filter((r) => r.delivery_status === "awaiting_approval").length,
    today_llm_invocations: todayRuns.filter((r) => r.llm_invoked).length,
    today_tokens: todayRuns.reduce((sum, r) => sum + (r.tokens_used || 0), 0),
    active_issues: activeIssues.length,
  };
  const analytics = buildHeartbeatAnalytics(runs, activeIssues);

  return {
    configs,
    dayBuckets: Array.from(buckets.values()),
    recentRuns: runs.slice(0, 20),
    activeIssues,
    recentEvents,
    recentManualTests,
    configStats,
    stats,
    analytics,
  };
}
