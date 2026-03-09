import type { SupabaseClient } from "@supabase/supabase-js";

export interface DayBucket {
  date: string; // YYYY-MM-DD
  total: number;
  succeeded: number;
  failed: number;
}

export type HealthStatus = "healthy" | "degraded" | "failing" | "inactive";

export interface ScheduleActivityData {
  id: string;
  schedule_key: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  agent_name: string | null;
  agent_id: string;
  channel_id: string;
  metadata: Record<string, unknown>;
  schedule_type: string;
  display_name: string | null;
  prompt: string | null;
  tools: string[];
  created_by: string;
  notify_on_failure: boolean;
  healthStatus: HealthStatus;
  dayBuckets: DayBucket[];
  recentRuns: RecentRun[];
  lastRunStatus: "completed" | "failed" | null;
}

export interface RecentRun {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  retry_attempt: number | null;
  response_preview: string | null;
}

function computeHealthStatus(buckets: DayBucket[], enabled: boolean): HealthStatus {
  if (!enabled) return "inactive";

  const activeBuckets = buckets.filter((b) => b.total > 0);
  if (activeBuckets.length === 0) return "inactive";

  const totalFailed = activeBuckets.reduce((s, b) => s + b.failed, 0);
  const totalRuns = activeBuckets.reduce((s, b) => s + b.total, 0);

  if (totalRuns === 0) return "inactive";
  if (totalFailed === 0) return "healthy";

  const failRate = totalFailed / totalRuns;
  if (failRate >= 0.5) return "failing";
  return "degraded";
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

interface ScheduleRow {
  id: string;
  schedule_key: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  agent_id: string;
  channel_id: string;
  metadata: Record<string, unknown>;
  schedule_type: string | null;
  display_name: string | null;
  prompt: string | null;
  tools: string[] | null;
  created_by: string | null;
  notify_on_failure: boolean;
  tenant_agents: { name: string } | { name: string }[] | null;
}

interface RunRow {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  metadata: { cron_schedule_id?: string; retry_attempt?: number } & Record<string, unknown>;
  result: Record<string, unknown> | null;
}

export async function fetchScheduleActivity(
  admin: SupabaseClient,
  tenantId: string
): Promise<ScheduleActivityData[]> {
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [schedulesResult, runsResult] = await Promise.all([
    admin
      .from("tenant_scheduled_messages")
      .select(
        "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, notify_on_failure, tenant_agents(name)"
      )
      .eq("tenant_id", tenantId)
      .order("enabled", { ascending: false })
      .order("schedule_key"),

    admin
      .from("tenant_runtime_runs")
      .select(
        "id, status, started_at, completed_at, error_message, created_at, metadata, result"
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", fourteenDaysAgo)
      .not("metadata->cron_schedule_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const schedules = (schedulesResult.data || []) as ScheduleRow[];
  const runs = (runsResult.data || []) as RunRow[];

  // Group runs by cron_schedule_id
  const runsBySchedule = new Map<string, RunRow[]>();
  for (const run of runs) {
    const scheduleId = run.metadata?.cron_schedule_id;
    if (!scheduleId) continue;
    const existing = runsBySchedule.get(scheduleId) || [];
    existing.push(run);
    runsBySchedule.set(scheduleId, existing);
  }

  return schedules.map((schedule) => {
    const scheduleRuns = runsBySchedule.get(schedule.id) || [];
    const tz = schedule.timezone || "America/Chicago";

    // Build 14-day buckets
    const buckets = buildEmptyBuckets();
    for (const run of scheduleRuns) {
      const dateKey = bucketDate(run.created_at, tz);
      const bucket = buckets.get(dateKey);
      if (bucket) {
        bucket.total++;
        if (run.status === "completed") bucket.succeeded++;
        if (run.status === "failed") bucket.failed++;
      }
    }
    const dayBuckets = Array.from(buckets.values());

    // Agent name from join
    const agentJoin = schedule.tenant_agents;
    const agentName = agentJoin
      ? Array.isArray(agentJoin)
        ? agentJoin[0]?.name ?? null
        : agentJoin.name
      : null;

    // Recent runs (last 10)
    const recentRuns: RecentRun[] = scheduleRuns.slice(0, 10).map((r) => {
      // Extract response preview from run result if available
      let responsePreview: string | null = null;
      if (r.result && typeof r.result === "object") {
        const res = r.result as Record<string, unknown>;
        // The AI worker stores dispatched content info in result
        if (typeof res.response_preview === "string") {
          responsePreview = res.response_preview;
        } else if (typeof res.dispatched_content === "string") {
          responsePreview = res.dispatched_content;
        }
      }

      return {
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        completed_at: r.completed_at,
        error_message: r.error_message,
        created_at: r.created_at,
        retry_attempt: r.metadata?.retry_attempt ?? null,
        response_preview: responsePreview,
      };
    });

    // Derive last run status from most recent run
    const lastRun = scheduleRuns[0];
    const lastRunStatus: "completed" | "failed" | null = lastRun
      ? lastRun.status === "completed"
        ? "completed"
        : lastRun.status === "failed"
          ? "failed"
          : null
      : null;

    return {
      id: schedule.id,
      schedule_key: schedule.schedule_key,
      cron_expression: schedule.cron_expression,
      timezone: tz,
      enabled: schedule.enabled,
      last_run_at: schedule.last_run_at,
      next_run_at: schedule.next_run_at,
      agent_name: agentName,
      agent_id: schedule.agent_id,
      channel_id: schedule.channel_id,
      metadata: (schedule.metadata || {}) as Record<string, unknown>,
      schedule_type: schedule.schedule_type ?? "predefined",
      display_name: schedule.display_name ?? null,
      prompt: schedule.prompt ?? null,
      tools: schedule.tools ?? [],
      created_by: schedule.created_by ?? "system",
      notify_on_failure: schedule.notify_on_failure ?? true,
      healthStatus: computeHealthStatus(dayBuckets, schedule.enabled),
      dayBuckets,
      recentRuns,
      lastRunStatus,
    };
  });
}
