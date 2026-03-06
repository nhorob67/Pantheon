import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayBucket } from "./schedule-activity";
import type { HeartbeatConfig, HeartbeatRun, HeartbeatStats } from "@/types/heartbeat";

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
  stats: HeartbeatStats;
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

  const [configsResult, runsResult] = await Promise.all([
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
  ]);

  const configs = (configsResult.data || []) as HeartbeatConfig[];
  const runs = (runsResult.data || []) as HeartbeatRun[];

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
    today_llm_invocations: todayRuns.filter((r) => r.llm_invoked).length,
    today_tokens: todayRuns.reduce((sum, r) => sum + (r.tokens_used || 0), 0),
  };

  return {
    configs,
    dayBuckets: Array.from(buckets.values()),
    recentRuns: runs.slice(0, 20),
    stats,
  };
}
