import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDelegationTree } from "@/lib/runtime/async-delegation-utils";

export interface ObservabilitySnapshot {
  queue_depth: number;
  runs_last_hour: {
    total: number;
    completed: number;
    failed: number;
    avg_latency_ms: number;
  };
  token_cost_today_cents: number;
  top_error_tenants: Array<{
    tenant_id: string;
    name: string;
    error_count: number;
  }>;
  tool_usage_24h: Array<{ tool_name: string; call_count: number }>;
}

export interface RunSummary {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  run_kind: string;
  status: string;
  delegation_depth: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface RunInvocation {
  id: string;
  tool_key: string;
  policy_decision: string;
  status: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  tool: {
    display_name: string;
    risk_level: string;
    metadata: Record<string, unknown>;
  } | null;
}

export interface RunGuardrailEvent {
  id: string;
  event_kind: string;
  tool_name: string | null;
  threshold: number;
  actual: number;
  action: string;
  message: string;
  created_at: string;
}

export interface RunDetail {
  id: string;
  tenant_id: string;
  customer_id: string;
  run_kind: string;
  status: string;
  attempt_count: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  parent_run_id: string | null;
  delegation_depth: number;
  delegation_kind: string | null;
  trace: Record<string, unknown> | null;
  invocations: RunInvocation[];
  guardrail_events: RunGuardrailEvent[];
}

export interface ChildRunSummary {
  id: string;
  parent_run_id: string | null;
  run_kind: string;
  status: string;
  delegation_kind: string | null;
  delegation_depth: number;
  target_agent_name: string | null;
  created_at: string;
  completed_at: string | null;
  latency_ms: number | null;
  children: ChildRunSummary[];
}

export async function getObservabilitySnapshot(
  admin: SupabaseClient
): Promise<ObservabilitySnapshot> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    queueResult,
    runsResult,
    failedResult,
    completedResult,
    usageResult,
    errorTenantsResult,
    toolTracesResult,
  ] = await Promise.all([
      // Queue depth
      admin
        .from("tenant_runtime_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued"),

      // Total runs last hour
      admin
        .from("tenant_runtime_runs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneHourAgo),

      // Failed runs last hour
      admin
        .from("tenant_runtime_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", oneHourAgo),

      // Completed runs last hour (for latency)
      admin
        .from("tenant_runtime_runs")
        .select("started_at, completed_at")
        .eq("status", "completed")
        .gte("created_at", oneHourAgo)
        .limit(200),

      // Token usage today
      admin
        .from("api_usage")
        .select("input_tokens, output_tokens")
        .gte("created_at", todayStart.toISOString()),

      // Top error tenants (24h)
      admin
        .from("tenant_runtime_runs")
        .select("tenant_id")
        .eq("status", "failed")
        .gte("created_at", oneDayAgo),

      // Tool usage from traces (24h)
      admin
        .from("tenant_conversation_traces")
        .select("tools_invoked")
        .gte("created_at", oneDayAgo),
    ]);

  // Compute avg latency
  const completedRows = (completedResult.data || []) as Array<{
    started_at: string | null;
    completed_at: string | null;
  }>;
  const latencies = completedRows
    .filter((r) => r.started_at && r.completed_at)
    .map(
      (r) =>
        new Date(r.completed_at!).getTime() -
        new Date(r.started_at!).getTime()
    )
    .filter((l) => l > 0 && l < 120_000);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  // Token cost (rough: $3/M input, $15/M output for Sonnet)
  const usageRows = (usageResult.data || []) as Array<{
    input_tokens: number;
    output_tokens: number;
  }>;
  const totalInput = usageRows.reduce((s, r) => s + (r.input_tokens || 0), 0);
  const totalOutput = usageRows.reduce(
    (s, r) => s + (r.output_tokens || 0),
    0
  );
  const costCents = Math.round(
    (totalInput / 1_000_000) * 300 + (totalOutput / 1_000_000) * 1500
  );

  // Top error tenants
  const errorCounts = new Map<string, number>();
  for (const row of (errorTenantsResult.data || []) as Array<{ tenant_id: string }>) {
    errorCounts.set(row.tenant_id, (errorCounts.get(row.tenant_id) || 0) + 1);
  }
  const topErrors = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tenant_id, error_count]) => ({
      tenant_id,
      name: tenant_id.slice(0, 8),
      error_count,
    }));

  const toolCounts = new Map<string, number>();
  for (const row of (toolTracesResult.data || []) as Array<{
    tools_invoked: Array<{ name: string }>;
  }>) {
    const tools = Array.isArray(row.tools_invoked) ? row.tools_invoked : [];
    for (const t of tools) {
      if (t.name) {
        toolCounts.set(t.name, (toolCounts.get(t.name) || 0) + 1);
      }
    }
  }
  const toolUsage = Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tool_name, call_count]) => ({ tool_name, call_count }));

  return {
    queue_depth: queueResult.count || 0,
    runs_last_hour: {
      total: runsResult.count || 0,
      completed: completedRows.length,
      failed: failedResult.count || 0,
      avg_latency_ms: avgLatency,
    },
    token_cost_today_cents: costCents,
    top_error_tenants: topErrors,
    tool_usage_24h: toolUsage,
  };
}

export async function listRuns(
  admin: SupabaseClient,
  filters: {
    status?: string;
    runKind?: string;
    tenantId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ runs: RunSummary[]; total: number }> {
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = filters.offset ?? 0;

  let query = admin
    .from("tenant_runtime_runs")
    .select(
      "id, tenant_id, run_kind, status, created_at, completed_at, error_message, delegation_depth",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.runKind) query = query.eq("run_kind", filters.runKind);
  if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);

  const { data, count, error } = await query;
  if (error) return { runs: [], total: 0 };

  return {
    runs: (data || []).map((r) => ({
      ...(r as RunSummary),
      tenant_name: null,
    })),
    total: count || 0,
  };
}

export async function getRunDetails(
  admin: SupabaseClient,
  runId: string
): Promise<RunDetail | null> {
  const [runResult, traceResult, invocationsResult, guardrailResult] = await Promise.all([
    admin
      .from("tenant_runtime_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle(),
    admin
      .from("tenant_conversation_traces")
      .select("*")
      .eq("run_id", runId)
      .maybeSingle(),
    admin
      .from("tenant_tool_invocations")
      .select("id, tool_key, policy_decision, status, error_message, started_at, completed_at, tool_id")
      .eq("run_id", runId)
      .order("started_at", { ascending: true })
      .limit(100),
    admin
      .from("tenant_guardrail_events")
      .select("id, event_kind, tool_name, threshold, actual, action, message, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true }),
  ]);

  if (runResult.error || !runResult.data) return null;

  // Resolve tool metadata for invocations
  const invocationRows = (invocationsResult.data || []) as Array<Record<string, unknown>>;
  const toolIds = invocationRows
    .map((r) => r.tool_id as string | null)
    .filter((id): id is string => id != null);

  const toolMap = new Map<string, { display_name: string; risk_level: string; metadata: Record<string, unknown> }>();
  if (toolIds.length > 0) {
    const { data: toolRows } = await admin
      .from("tenant_tools")
      .select("id, display_name, risk_level, metadata")
      .in("id", [...new Set(toolIds)]);
    for (const t of (toolRows || []) as Array<{ id: string; display_name: string; risk_level: string; metadata: Record<string, unknown> }>) {
      toolMap.set(t.id, { display_name: t.display_name, risk_level: t.risk_level, metadata: t.metadata });
    }
  }

  const invocations: RunInvocation[] = invocationRows.map((r) => ({
    id: String(r.id),
    tool_key: String(r.tool_key),
    policy_decision: String(r.policy_decision),
    status: String(r.status),
    error_message: typeof r.error_message === "string" ? r.error_message : null,
    started_at: typeof r.started_at === "string" ? r.started_at : null,
    completed_at: typeof r.completed_at === "string" ? r.completed_at : null,
    tool: r.tool_id ? toolMap.get(String(r.tool_id)) ?? null : null,
  }));

  const trace = traceResult.data;
  const row = runResult.data as Record<string, unknown>;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    customer_id: String(row.customer_id),
    run_kind: String(row.run_kind),
    status: String(row.status),
    attempt_count: Number(row.attempt_count || 0),
    payload: (row.payload as Record<string, unknown>) || {},
    result: (row.result as Record<string, unknown>) || {},
    error_message:
      typeof row.error_message === "string" ? row.error_message : null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    created_at: String(row.created_at),
    started_at:
      typeof row.started_at === "string" ? row.started_at : null,
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    parent_run_id: typeof row.parent_run_id === "string" ? row.parent_run_id : null,
    delegation_depth: Number(row.delegation_depth || 0),
    delegation_kind: typeof row.delegation_kind === "string" ? row.delegation_kind : null,
    trace: trace as Record<string, unknown> | null,
    invocations,
    guardrail_events: (guardrailResult.data || []) as RunGuardrailEvent[],
  };
}

// ---------------------------------------------------------------------------
// Browser Session Analytics
// ---------------------------------------------------------------------------

export interface BrowserSessionAnalytics {
  totalSessions: number;
  successRate: number;
  topDomains: Array<{ domain: string; count: number }>;
  failureBreakdown: Array<{ status: string; count: number }>;
}

export async function getBrowserSessionAnalytics(
  admin: SupabaseClient
): Promise<BrowserSessionAnalytics> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await admin
    .from("tenant_browser_sessions")
    .select("status, current_url")
    .gte("created_at", oneDayAgo);

  const rows = (sessions ?? []) as Array<{ status: string; current_url: string | null }>;
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;

  const domainCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.current_url) continue;
    try {
      const hostname = new URL(row.current_url).hostname;
      domainCounts.set(hostname, (domainCounts.get(hostname) ?? 0) + 1);
    } catch {
      // invalid URL
    }
  }
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  const statusCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "completed") {
      statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    }
  }
  const failureBreakdown = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));

  return {
    totalSessions: total,
    successRate: total > 0 ? completed / total : 0,
    topDomains,
    failureBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Delegation Analytics
// ---------------------------------------------------------------------------

export interface DelegationAnalytics {
  totalDelegations: number;
  successRate: number;
  depthDistribution: Array<{ depth: number; count: number }>;
  topDelegatingAgents: Array<{ agentName: string; count: number }>;
  avgLatencyMs: number;
}

export async function getDelegationAnalytics(
  admin: SupabaseClient
): Promise<DelegationAnalytics> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: runs } = await admin
    .from("tenant_runtime_runs")
    .select("status, delegation_depth, delegation_kind, payload, started_at, completed_at")
    .not("delegation_kind", "is", null)
    .gte("created_at", oneDayAgo);

  const rows = (runs ?? []) as Array<{
    status: string;
    delegation_depth: number;
    delegation_kind: string;
    payload: Record<string, unknown>;
    started_at: string | null;
    completed_at: string | null;
  }>;

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;

  // Depth distribution
  const depthCounts = new Map<number, number>();
  for (const row of rows) {
    const depth = row.delegation_depth ?? 0;
    depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + 1);
  }
  const depthDistribution = Array.from(depthCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([depth, count]) => ({ depth, count }));

  // Top delegating agents (by parent agent name from payload)
  const agentCounts = new Map<string, number>();
  for (const row of rows) {
    const agentName = (row.payload?.delegated_by_name as string) ?? "Unknown";
    agentCounts.set(agentName, (agentCounts.get(agentName) ?? 0) + 1);
  }
  const topDelegatingAgents = Array.from(agentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([agentName, count]) => ({ agentName, count }));

  // Avg latency
  const latencies = rows
    .filter((r) => r.started_at && r.completed_at)
    .map((r) => new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime())
    .filter((l) => l > 0 && l < 300_000);
  const avgLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  return {
    totalDelegations: total,
    successRate: total > 0 ? completed / total : 0,
    depthDistribution,
    topDelegatingAgents,
    avgLatencyMs,
  };
}

export async function getChildRuns(
  admin: SupabaseClient,
  parentRunId: string
): Promise<ChildRunSummary[]> {
  const allRows: Array<Omit<ChildRunSummary, "children">> = [];
  const seenRunIds = new Set<string>();
  let frontier = [parentRunId];

  while (frontier.length > 0 && allRows.length < 200) {
    const { data, error } = await admin
      .from("tenant_runtime_runs")
      .select("id, parent_run_id, run_kind, status, delegation_kind, delegation_depth, payload, created_at, completed_at, started_at")
      .in("parent_run_id", frontier)
      .order("created_at", { ascending: true })
      .limit(200 - allRows.length);

    if (error || !data || data.length === 0) {
      break;
    }

    const nextFrontier: string[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
      const runId = String(row.id);
      if (seenRunIds.has(runId)) {
        continue;
      }

      seenRunIds.add(runId);
      nextFrontier.push(runId);

      const startedAt =
        typeof row.started_at === "string" ? new Date(row.started_at).getTime() : null;
      const completedAt =
        typeof row.completed_at === "string" ? new Date(row.completed_at).getTime() : null;
      const latency = startedAt && completedAt ? completedAt - startedAt : null;
      const payload = (row.payload ?? {}) as Record<string, unknown>;

      allRows.push({
        id: runId,
        parent_run_id: typeof row.parent_run_id === "string" ? row.parent_run_id : null,
        run_kind: String(row.run_kind),
        status: String(row.status),
        delegation_kind:
          typeof row.delegation_kind === "string" ? row.delegation_kind : null,
        delegation_depth: Number(row.delegation_depth || 0),
        target_agent_name: (payload.target_agent_name as string) ?? null,
        created_at: String(row.created_at),
        completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
        latency_ms: latency,
      });
    }

    frontier = nextFrontier;
  }

  return buildDelegationTree(allRows, parentRunId);
}
