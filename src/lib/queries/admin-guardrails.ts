import type { SupabaseClient } from "@supabase/supabase-js";

export interface GuardrailEventRow {
  id: string;
  tenant_id: string;
  run_id: string;
  agent_id: string | null;
  event_kind: string;
  tool_name: string | null;
  threshold: number;
  actual: number;
  action: string;
  message: string;
  created_at: string;
}

export interface GuardrailSnapshot {
  total_events_24h: number;
  halts_24h: number;
  warnings_24h: number;
  top_event_kinds: Array<{ event_kind: string; count: number }>;
  top_halted_tenants: Array<{ tenant_id: string; halt_count: number }>;
  recent_events: GuardrailEventRow[];
}

export async function getGuardrailSnapshot(
  admin: SupabaseClient
): Promise<GuardrailSnapshot> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, recentResult] = await Promise.all([
    admin
      .from("tenant_guardrail_events")
      .select("id, tenant_id, event_kind, action")
      .gte("created_at", oneDayAgo),
    admin
      .from("tenant_guardrail_events")
      .select("id, tenant_id, run_id, agent_id, event_kind, tool_name, threshold, actual, action, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const events = (eventsResult.data || []) as Array<{
    id: string;
    tenant_id: string;
    event_kind: string;
    action: string;
  }>;

  const halts = events.filter((e) => e.action === "halt");
  const warnings = events.filter((e) => e.action === "warn");

  // Top event kinds
  const kindCounts = new Map<string, number>();
  for (const e of events) {
    kindCounts.set(e.event_kind, (kindCounts.get(e.event_kind) || 0) + 1);
  }
  const topKinds = Array.from(kindCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([event_kind, count]) => ({ event_kind, count }));

  // Top halted tenants
  const haltTenantCounts = new Map<string, number>();
  for (const e of halts) {
    haltTenantCounts.set(e.tenant_id, (haltTenantCounts.get(e.tenant_id) || 0) + 1);
  }
  const topHaltedTenants = Array.from(haltTenantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tenant_id, halt_count]) => ({ tenant_id, halt_count }));

  return {
    total_events_24h: events.length,
    halts_24h: halts.length,
    warnings_24h: warnings.length,
    top_event_kinds: topKinds,
    top_halted_tenants: topHaltedTenants,
    recent_events: (recentResult.data || []) as GuardrailEventRow[],
  };
}

export async function listGuardrailEvents(
  admin: SupabaseClient,
  filters: {
    tenantId?: string;
    action?: string;
    eventKind?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ events: GuardrailEventRow[]; total: number }> {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  let query = admin
    .from("tenant_guardrail_events")
    .select(
      "id, tenant_id, run_id, agent_id, event_kind, tool_name, threshold, actual, action, message, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.eventKind) query = query.eq("event_kind", filters.eventKind);

  const { data, count, error } = await query;
  if (error) return { events: [], total: 0 };

  return {
    events: (data || []) as GuardrailEventRow[],
    total: count || 0,
  };
}

// ---------------------------------------------------------------------------
// Phase 6.3: Guardrail analytics
// ---------------------------------------------------------------------------

export interface GuardrailAnalytics {
  /** Trigger frequency by event kind over the time range */
  kindFrequency: Array<{ event_kind: string; count: number }>;
  /** Daily halt count for trend analysis */
  dailyHaltTrend: Array<{ date: string; halt_count: number; warn_count: number }>;
  /** Runs that were halted but still completed successfully (false-positive proxy) */
  falsePositiveProxy: {
    totalHaltedRuns: number;
    haltedRunsThatSucceeded: number;
    rate: number;
  };
  /** Estimated cost savings from halted runs */
  estimatedCostSavings: {
    haltedRunCount: number;
    estimatedSavedCents: number;
  };
}

export async function getGuardrailAnalytics(
  admin: SupabaseClient,
  daysBack: number = 7
): Promise<GuardrailAnalytics> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await admin
    .from("tenant_guardrail_events")
    .select("event_kind, action, run_id, created_at")
    .gte("created_at", since);

  const rows = (events || []) as Array<{
    event_kind: string;
    action: string;
    run_id: string;
    created_at: string;
  }>;

  // Kind frequency
  const kindMap = new Map<string, number>();
  for (const e of rows) {
    kindMap.set(e.event_kind, (kindMap.get(e.event_kind) || 0) + 1);
  }
  const kindFrequency = Array.from(kindMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([event_kind, count]) => ({ event_kind, count }));

  // Daily trend
  const dailyMap = new Map<string, { halt: number; warn: number }>();
  for (const e of rows) {
    const date = e.created_at.slice(0, 10); // YYYY-MM-DD
    const entry = dailyMap.get(date) ?? { halt: 0, warn: 0 };
    if (e.action === "halt") entry.halt++;
    else entry.warn++;
    dailyMap.set(date, entry);
  }
  const dailyHaltTrend = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { halt, warn }]) => ({
      date,
      halt_count: halt,
      warn_count: warn,
    }));

  // False positive proxy: runs with halt events
  const haltedRunIds = new Set(
    rows.filter((e) => e.action === "halt").map((e) => e.run_id)
  );
  const totalHaltedRuns = haltedRunIds.size;

  // Check how many of those runs still completed successfully
  let haltedRunsThatSucceeded = 0;
  if (totalHaltedRuns > 0) {
    const runIds = Array.from(haltedRunIds).slice(0, 200); // cap query size
    const { data: runs } = await admin
      .from("tenant_runtime_runs")
      .select("id, status")
      .in("id", runIds)
      .eq("status", "completed");
    haltedRunsThatSucceeded = (runs || []).length;
  }

  const fpRate =
    totalHaltedRuns > 0 ? haltedRunsThatSucceeded / totalHaltedRuns : 0;

  // Cost savings estimate: average run cost * halted runs
  // Use a conservative estimate of 15 cents per run (based on typical token usage)
  const AVG_RUN_COST_CENTS = 15;
  const pureHaltRuns = totalHaltedRuns - haltedRunsThatSucceeded;

  return {
    kindFrequency,
    dailyHaltTrend,
    falsePositiveProxy: {
      totalHaltedRuns,
      haltedRunsThatSucceeded,
      rate: Math.round(fpRate * 100) / 100,
    },
    estimatedCostSavings: {
      haltedRunCount: pureHaltRuns,
      estimatedSavedCents: pureHaltRuns * AVG_RUN_COST_CENTS,
    },
  };
}
