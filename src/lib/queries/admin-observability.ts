import type { SupabaseClient } from "@supabase/supabase-js";

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
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
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
  trace: Record<string, unknown> | null;
}

export async function getObservabilitySnapshot(
  admin: SupabaseClient
): Promise<ObservabilitySnapshot> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [queueResult, runsResult, failedResult, completedResult, usageResult] =
    await Promise.all([
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
  const { data: errorTenants } = await admin
    .from("tenant_runtime_runs")
    .select("tenant_id")
    .eq("status", "failed")
    .gte("created_at", oneDayAgo);

  const errorCounts = new Map<string, number>();
  for (const row of (errorTenants || []) as Array<{ tenant_id: string }>) {
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

  // Tool usage (from traces)
  const { data: toolTraces } = await admin
    .from("tenant_conversation_traces")
    .select("tools_invoked")
    .gte("created_at", oneDayAgo);

  const toolCounts = new Map<string, number>();
  for (const row of (toolTraces || []) as Array<{
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
      "id, tenant_id, run_kind, status, created_at, completed_at, error_message",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq("status", filters.status);
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
  const { data, error } = await admin
    .from("tenant_runtime_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: trace } = await admin
    .from("tenant_conversation_traces")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();

  const row = data as Record<string, unknown>;
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
    trace: trace as Record<string, unknown> | null,
  };
}
