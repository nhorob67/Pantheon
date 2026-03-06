import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TenantHealthData {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  trial_tenants: number;
  active_conversations_24h: number;
  inactive_tenants_7d: {
    tenant_id: string;
    tenant_name: string;
    customer_email: string | null;
    last_activity_at: string | null;
  }[];
  spending_cap_alerts: {
    tenant_id: string;
    tenant_name: string;
    customer_email: string | null;
    cap_cents: number;
    used_cents: number;
    percentage: number;
  }[];
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toSafeDate(value: unknown): string {
  if (typeof value === "string") {
    return value.split("T")[0];
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return "";
}

function toSafeTimestamp(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

export async function getTenantHealth(
  admin: SupabaseClient
): Promise<TenantHealthData> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  const [
    { data: tenantsData, error: tenantsError },
    { data: recentSessions, error: sessionsError },
    { data: allTenants, error: allTenantsError },
    { data: spendingData, error: spendingError },
  ] = await Promise.all([
    admin
      .from("tenants")
      .select("id, status")
      .in("status", ["active", "suspended", "trial"]),
    admin
      .from("tenant_sessions")
      .select("tenant_id")
      .gte("updated_at", twentyFourHoursAgo),
    admin
      .from("tenants")
      .select("id, name, status, customer_id, customers(email)")
      .in("status", ["active", "trial"]),
    admin.rpc("admin_customers_approaching_limits", {
      p_start_date: monthStart,
      p_min_percentage: 70,
    }),
  ]);

  if (tenantsError) throw new Error(tenantsError.message);
  if (sessionsError) throw new Error(sessionsError.message);
  if (allTenantsError) throw new Error(allTenantsError.message);

  const tenantRows = (tenantsData || []) as Array<{ id: string; status: string }>;
  const totalTenants = tenantRows.length;
  const activeTenants = tenantRows.filter((t) => t.status === "active").length;
  const suspendedTenants = tenantRows.filter((t) => t.status === "suspended").length;
  const trialTenants = tenantRows.filter((t) => t.status === "trial").length;

  const uniqueActiveSessionTenants = new Set(
    ((recentSessions || []) as Array<{ tenant_id: string }>).map((s) => s.tenant_id)
  );

  // Find inactive tenants — active/trial tenants with no sessions in 7 days
  const inactiveTenants: TenantHealthData["inactive_tenants_7d"] = [];
  const allTenantRows = (allTenants || []) as Array<{
    id: string;
    name: string;
    status: string;
    customer_id: string;
    customers: { email: string | null } | { email: string | null }[] | null;
  }>;

  // Check each tenant for recent session activity
  const { data: recentActivity, error: activityError } = await admin
    .from("tenant_sessions")
    .select("tenant_id, updated_at")
    .in("tenant_id", allTenantRows.map((t) => t.id))
    .gte("updated_at", sevenDaysAgo);

  if (!activityError) {
    const activeSet = new Set(
      ((recentActivity || []) as Array<{ tenant_id: string }>).map((s) => s.tenant_id)
    );
    for (const tenant of allTenantRows) {
      if (!activeSet.has(tenant.id)) {
        const customerEmail = tenant.customers
          ? Array.isArray(tenant.customers)
            ? tenant.customers[0]?.email ?? null
            : tenant.customers.email
          : null;
        inactiveTenants.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          customer_email: customerEmail,
          last_activity_at: null,
        });
      }
    }
  }

  // Spending cap alerts
  const spendingAlerts: TenantHealthData["spending_cap_alerts"] = [];
  if (!spendingError && spendingData) {
    for (const row of spendingData as Array<{
      customer_id: string;
      email: string | null;
      spending_cap_cents: unknown;
      current_cents: unknown;
      percentage: unknown;
    }>) {
      // Find tenant for this customer
      const matchingTenant = allTenantRows.find((t) => t.customer_id === row.customer_id);
      if (matchingTenant) {
        spendingAlerts.push({
          tenant_id: matchingTenant.id,
          tenant_name: matchingTenant.name,
          customer_email: row.email,
          cap_cents: toSafeNumber(row.spending_cap_cents),
          used_cents: toSafeNumber(row.current_cents),
          percentage: toSafeNumber(row.percentage),
        });
      }
    }
  }

  return {
    total_tenants: totalTenants,
    active_tenants: activeTenants,
    suspended_tenants: suspendedTenants,
    trial_tenants: trialTenants,
    active_conversations_24h: uniqueActiveSessionTenants.size,
    inactive_tenants_7d: inactiveTenants.slice(0, 20),
    spending_cap_alerts: spendingAlerts,
  };
}

export interface RevenueData {
  mrr: number;
  total_customers: number;
  breakdown: {
    active: number;
    past_due: number;
    canceled: number;
    incomplete: number;
  };
}

export async function getRevenueBreakdown(
  admin: SupabaseClient
): Promise<RevenueData> {
  const { data, error } = await admin.rpc("admin_revenue_breakdown_counts");
  if (error) throw new Error(error.message);

  const row = ((data || [])[0] || {}) as {
    total_customers?: unknown;
    active?: unknown;
    past_due?: unknown;
    canceled?: unknown;
    incomplete?: unknown;
  };
  const breakdown = {
    active: toSafeNumber(row.active),
    past_due: toSafeNumber(row.past_due),
    canceled: toSafeNumber(row.canceled),
    incomplete: toSafeNumber(row.incomplete),
  };

  const mrr = breakdown.active * 5000;

  return {
    mrr,
    total_customers: toSafeNumber(row.total_customers),
    breakdown,
  };
}

export interface DailyUsage {
  date: string;
  cost_cents: number;
  input_tokens: number;
  output_tokens: number;
}

export interface TopConsumer {
  customer_id: string;
  email: string | null;
  total_cost_cents: number;
}

export interface UsageAnalytics {
  daily: DailyUsage[];
  top_consumers: TopConsumer[];
}

export async function getUsageAnalytics(
  admin: SupabaseClient
): Promise<UsageAnalytics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];
  const [
    { data: dailyData, error: dailyError },
    { data: topData, error: topError },
  ] = await Promise.all([
    admin.rpc("admin_usage_daily_30d", { p_start_date: startDate }),
    admin.rpc("admin_usage_top_consumers_30d", {
      p_start_date: startDate,
      p_limit: 10,
    }),
  ]);

  if (dailyError) throw new Error(dailyError.message);
  if (topError) throw new Error(topError.message);

  const daily = ((dailyData || []) as Array<{
    date: unknown;
    cost_cents: unknown;
    input_tokens: unknown;
    output_tokens: unknown;
  }>).map((row) => ({
    date: toSafeDate(row.date),
    cost_cents: toSafeNumber(row.cost_cents),
    input_tokens: toSafeNumber(row.input_tokens),
    output_tokens: toSafeNumber(row.output_tokens),
  }));

  const topConsumers = ((topData || []) as Array<{
    customer_id: string;
    email: string | null;
    total_cost_cents: unknown;
  }>).map((row) => ({
    customer_id: row.customer_id,
    email: row.email,
    total_cost_cents: toSafeNumber(row.total_cost_cents),
  }));

  return {
    daily,
    top_consumers: topConsumers,
  };
}

// ── Conversation Analytics ──────────────────────────────
export interface ConversationAnalytics {
  total_messages_30d: number;
  total_conversations_30d: number;
  daily_messages: { date: string; count: number }[];
}

export async function getConversationAnalytics(
  admin: SupabaseClient
): Promise<ConversationAnalytics> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];
  const [
    { data: summaryData, error: summaryError },
    { data: dailyData, error: dailyError },
  ] = await Promise.all([
    admin.rpc("admin_conversation_summary_30d", { p_start_date: startDate }),
    admin.rpc("admin_conversation_daily_messages_30d", {
      p_start_date: startDate,
    }),
  ]);

  if (summaryError) throw new Error(summaryError.message);
  if (dailyError) throw new Error(dailyError.message);

  const summary = ((summaryData || [])[0] || {}) as {
    total_messages_30d?: unknown;
    total_conversations_30d?: unknown;
  };

  const daily = ((dailyData || []) as Array<{ date: unknown; count: unknown }>).map(
    (row) => ({
      date: toSafeDate(row.date),
      count: toSafeNumber(row.count),
    })
  );

  return {
    total_messages_30d: toSafeNumber(summary.total_messages_30d),
    total_conversations_30d: toSafeNumber(summary.total_conversations_30d),
    daily_messages: daily,
  };
}

// ── Spending Alerts ────────────────────────────────────
export interface CustomerSpendingAlert {
  customer_id: string;
  email: string | null;
  spending_cap_cents: number;
  current_cents: number;
  percentage: number;
  auto_pause: boolean;
}

export async function getCustomersApproachingLimits(
  admin: SupabaseClient
): Promise<CustomerSpendingAlert[]> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { data, error } = await admin.rpc("admin_customers_approaching_limits", {
    p_start_date: startOfMonth.toISOString().split("T")[0],
    p_min_percentage: 50,
  });

  if (error) throw new Error(error.message);

  return ((data || []) as Array<{
    customer_id: string;
    email: string | null;
    spending_cap_cents: unknown;
    current_cents: unknown;
    percentage: unknown;
    auto_pause: boolean | null;
  }>).map((row) => ({
    customer_id: row.customer_id,
    email: row.email,
    spending_cap_cents: toSafeNumber(row.spending_cap_cents),
    current_cents: toSafeNumber(row.current_cents),
    percentage: toSafeNumber(row.percentage),
    auto_pause: row.auto_pause || false,
  }));
}

export interface ExtensibilityTelemetryBucket {
  key: string;
  count: number;
  error_count: number;
  avg_latency_ms: number | null;
}

export interface ExtensibilityTelemetrySummary {
  total_events: number;
  error_events: number;
  error_rate_percent: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
}

export interface ExtensibilityTelemetryData {
  last_24h: ExtensibilityTelemetrySummary;
  top_event_types: ExtensibilityTelemetryBucket[];
  top_tools: ExtensibilityTelemetryBucket[];
}

function toAverage(sum: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round((sum / count) * 100) / 100;
}

function toP95(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  );
  return sorted[index];
}

function emptyTelemetryData(): ExtensibilityTelemetryData {
  return {
    last_24h: {
      total_events: 0,
      error_events: 0,
      error_rate_percent: 0,
      avg_latency_ms: null,
      p95_latency_ms: null,
    },
    top_event_types: [],
    top_tools: [],
  };
}

export async function getExtensibilityTelemetry(
  admin: SupabaseClient
): Promise<ExtensibilityTelemetryData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgoMs = Date.now() - 24 * 60 * 60 * 1000;

  const { data, error } = await admin
    .from("telemetry_events")
    .select("event_type, tool_name, latency_ms, error_class, created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    // Table may not exist in environments where migration is not yet applied.
    if (error.code === "42P01") {
      return emptyTelemetryData();
    }

    throw new Error(error.message);
  }

  const rows = data || [];
  const in24h = rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime();
    return Number.isFinite(timestamp) && timestamp >= twentyFourHoursAgoMs;
  });

  const latencies24 = in24h
    .map((row) => row.latency_ms)
    .filter((latency): latency is number => typeof latency === "number" && latency >= 0);
  const errorCount24 = in24h.filter((row) => !!row.error_class).length;

  const bucketByEventType = new Map<
    string,
    { count: number; errorCount: number; latencySum: number; latencyCount: number }
  >();
  const bucketByTool = new Map<
    string,
    { count: number; errorCount: number; latencySum: number; latencyCount: number }
  >();

  for (const row of rows) {
    const eventTypeKey = row.event_type || "unknown";
    const toolKey = row.tool_name || "none";
    const isError = !!row.error_class;
    const latency = typeof row.latency_ms === "number" && row.latency_ms >= 0
      ? row.latency_ms
      : null;

    const eventBucket = bucketByEventType.get(eventTypeKey) || {
      count: 0,
      errorCount: 0,
      latencySum: 0,
      latencyCount: 0,
    };
    eventBucket.count += 1;
    if (isError) eventBucket.errorCount += 1;
    if (latency !== null) {
      eventBucket.latencySum += latency;
      eventBucket.latencyCount += 1;
    }
    bucketByEventType.set(eventTypeKey, eventBucket);

    const toolBucket = bucketByTool.get(toolKey) || {
      count: 0,
      errorCount: 0,
      latencySum: 0,
      latencyCount: 0,
    };
    toolBucket.count += 1;
    if (isError) toolBucket.errorCount += 1;
    if (latency !== null) {
      toolBucket.latencySum += latency;
      toolBucket.latencyCount += 1;
    }
    bucketByTool.set(toolKey, toolBucket);
  }

  const toBuckets = (
    source: Map<string, { count: number; errorCount: number; latencySum: number; latencyCount: number }>
  ): ExtensibilityTelemetryBucket[] =>
    Array.from(source.entries())
      .map(([key, value]) => ({
        key,
        count: value.count,
        error_count: value.errorCount,
        avg_latency_ms: toAverage(value.latencySum, value.latencyCount),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  const total24 = in24h.length;
  return {
    last_24h: {
      total_events: total24,
      error_events: errorCount24,
      error_rate_percent: total24 > 0 ? (errorCount24 / total24) * 100 : 0,
      avg_latency_ms: toAverage(
        latencies24.reduce((sum, value) => sum + value, 0),
        latencies24.length
      ),
      p95_latency_ms: toP95(latencies24),
    },
    top_event_types: toBuckets(bucketByEventType),
    top_tools: toBuckets(bucketByTool),
  };
}

// ── Discord Token Migration Check ────────────────────────
/**
 * Count instances that still have a plaintext `token` field in `channel_config`.
 * Used on the admin dashboard to confirm migration to encrypted storage is complete.
 */
export async function countPlaintextTokenInstances(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("instances")
    .select("id", { count: "exact", head: true })
    .not("channel_config->token", "is", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
