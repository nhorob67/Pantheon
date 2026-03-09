import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildHeartbeatAnalytics,
  fetchHeartbeatActivity,
  type HeartbeatActivityData,
} from "./heartbeat-activity";
import type {
  HeartbeatAuditItem,
  HeartbeatAuditReport,
  HeartbeatBreakdownItem,
  HeartbeatIssue,
  HeartbeatOperatorEvent,
  HeartbeatRun,
  HeartbeatRunsReport,
  HeartbeatSeries,
  HeartbeatTrendsReport,
  HeartbeatTriggerMode,
} from "@/types/heartbeat";

const REPORT_ROW_LIMIT = 5000;

export interface HeartbeatRunsReportFilters {
  config_id?: string;
  delivery_status?: HeartbeatRun["delivery_status"];
  trigger_mode?: HeartbeatTriggerMode;
  signal_type?: string;
  date_from?: string;
  date_to?: string;
  query?: string;
  page: number;
  page_size: number;
}

export interface HeartbeatTrendsReportFilters {
  config_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface HeartbeatAuditReportFilters {
  config_id?: string;
  kind?: HeartbeatAuditItem["kind"] | "manual_action" | "approval";
  date_from?: string;
  date_to?: string;
  query?: string;
  page: number;
  page_size: number;
}

interface TenantApprovalRow {
  id: string;
  status: string;
  required_role: string;
  request_payload: Record<string, unknown>;
  decision_payload: Record<string, unknown>;
  requested_by: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
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
  limit = 8
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

function bucketDate(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

function getDateRange(filters: {
  date_from?: string;
  date_to?: string;
}): { fromIso: string | null; toIso: string | null } {
  const fromIso = filters.date_from
    ? new Date(`${filters.date_from}T00:00:00.000Z`).toISOString()
    : null;
  const toIso = filters.date_to
    ? new Date(`${filters.date_to}T23:59:59.999Z`).toISOString()
    : null;

  return { fromIso, toIso };
}

function extractSignalTypes(run: HeartbeatRun): string[] {
  const decisionTrace = asRecord(run.decision_trace);
  const selected = asStringArray(decisionTrace.selected_signal_types);
  if (selected.length > 0) {
    return selected;
  }

  return asStringArray(decisionTrace.signal_types);
}

function summarizeRunForSearch(run: HeartbeatRun): string {
  const checks = Object.values(run.checks_executed || {})
    .map((result) => (typeof result?.summary === "string" ? result.summary : ""))
    .join(" ");

  return [
    run.id,
    run.runtime_run_id,
    run.delivery_status,
    run.suppressed_reason,
    run.error_message,
    ...extractSignalTypes(run),
    checks,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

async function fetchRunsForTenant(
  admin: SupabaseClient,
  tenantId: string,
  filters: {
    config_id?: string;
    delivery_status?: HeartbeatRun["delivery_status"];
    trigger_mode?: HeartbeatTriggerMode;
    date_from?: string;
    date_to?: string;
  }
): Promise<HeartbeatRun[]> {
  const { fromIso, toIso } = getDateRange(filters);
  let query = admin
    .from("tenant_heartbeat_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("ran_at", { ascending: false })
    .limit(REPORT_ROW_LIMIT);

  if (filters.config_id) {
    query = query.eq("config_id", filters.config_id);
  }
  if (filters.delivery_status) {
    query = query.eq("delivery_status", filters.delivery_status);
  }
  if (filters.trigger_mode) {
    query = query.eq("trigger_mode", filters.trigger_mode);
  }
  if (fromIso) {
    query = query.gte("ran_at", fromIso);
  }
  if (toIso) {
    query = query.lte("ran_at", toIso);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HeartbeatRun[];
}

async function fetchHeartbeatApprovals(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantApprovalRow[]> {
  const { data, error } = await admin
    .from("tenant_approvals")
    .select(
      "id, status, required_role, request_payload, decision_payload, requested_by, decided_by, created_at, decided_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as TenantApprovalRow[]).filter((approval) => {
    const payload = asRecord(approval.request_payload);
    return payload.kind === "heartbeat_alert";
  });
}

function matchesDateRange(
  iso: string,
  filters: { date_from?: string; date_to?: string }
): boolean {
  const { fromIso, toIso } = getDateRange(filters);
  if (fromIso && iso < fromIso) {
    return false;
  }
  if (toIso && iso > toIso) {
    return false;
  }
  return true;
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export async function fetchHeartbeatOverview(
  admin: SupabaseClient,
  tenantId: string
): Promise<HeartbeatActivityData> {
  return fetchHeartbeatActivity(admin, tenantId);
}

export async function fetchHeartbeatRunsReport(
  admin: SupabaseClient,
  tenantId: string,
  filters: HeartbeatRunsReportFilters
): Promise<HeartbeatRunsReport> {
  const baseRuns = await fetchRunsForTenant(admin, tenantId, filters);
  const queryValue = filters.query?.trim().toLowerCase() || "";

  const filteredRuns = baseRuns.filter((run) => {
    if (filters.signal_type && !extractSignalTypes(run).includes(filters.signal_type)) {
      return false;
    }

    if (queryValue.length > 0 && !summarizeRunForSearch(run).includes(queryValue)) {
      return false;
    }

    return true;
  });

  const availableSignalTypes = Array.from(
    new Set(filteredRuns.flatMap((run) => extractSignalTypes(run)))
  ).sort((left, right) => left.localeCompare(right));

  return {
    runs: paginate(filteredRuns, filters.page, filters.page_size),
    total: filteredRuns.length,
    page: filters.page,
    page_size: filters.page_size,
    available_signal_types: availableSignalTypes,
  };
}

function buildSeriesFromBucketMap(
  buckets: Map<string, Map<string, number>>,
  selectedKeys: string[]
): HeartbeatSeries[] {
  const dates = Array.from(buckets.keys()).sort((left, right) => left.localeCompare(right));

  return selectedKeys.map((key) => ({
    key,
    label: formatBreakdownLabel(key),
    points: dates.map((date) => ({
      date,
      value: buckets.get(date)?.get(key) || 0,
    })),
  }));
}

function buildScalarSeries(
  valuesByDate: Map<string, number>,
  key: string,
  label: string
): HeartbeatSeries[] {
  return [
    {
      key,
      label,
      points: Array.from(valuesByDate.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, value]) => ({ date, value })),
    },
  ];
}

export async function fetchHeartbeatTrendsReport(
  admin: SupabaseClient,
  tenantId: string,
  filters: HeartbeatTrendsReportFilters
): Promise<HeartbeatTrendsReport> {
  const eventsQuery = admin
    .from("tenant_heartbeat_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const issuesQuery = admin
    .from("tenant_heartbeat_signals")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("resolved_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(500);

  if (filters.config_id) {
    eventsQuery.eq("config_id", filters.config_id);
    issuesQuery.eq("config_id", filters.config_id);
  }

  const [runs, issuesResult, approvals, events] = await Promise.all([
    fetchRunsForTenant(admin, tenantId, filters),
    issuesQuery,
    fetchHeartbeatApprovals(admin, tenantId),
    eventsQuery,
  ]);
  const activeIssues = (issuesResult.data || []) as HeartbeatIssue[];

  const deliveryBuckets = new Map<string, Map<string, number>>();
  const signalBuckets = new Map<string, Map<string, number>>();
  const approvalBuckets = new Map<string, Map<string, number>>();
  const latencySums = new Map<string, { total: number; count: number }>();
  const tokenTotals = new Map<string, number>();
  const approvalBreakdown = new Map<string, number>();
  const manualActionBreakdown = new Map<string, number>();

  for (const run of runs) {
    const dateKey = bucketDate(run.ran_at);
    const delivery = deliveryBuckets.get(dateKey) || new Map<string, number>();
    incrementCount(delivery, run.delivery_status);
    deliveryBuckets.set(dateKey, delivery);

    const signal = signalBuckets.get(dateKey) || new Map<string, number>();
    for (const signalType of extractSignalTypes(run)) {
      incrementCount(signal, signalType);
    }
    signalBuckets.set(dateKey, signal);

    if (typeof run.duration_ms === "number" && Number.isFinite(run.duration_ms)) {
      const current = latencySums.get(dateKey) || { total: 0, count: 0 };
      current.total += run.duration_ms;
      current.count += 1;
      latencySums.set(dateKey, current);
    }

    tokenTotals.set(dateKey, (tokenTotals.get(dateKey) || 0) + (run.tokens_used || 0));
  }

  for (const approval of approvals) {
    if (!matchesDateRange(approval.created_at, filters)) {
      continue;
    }
    const payload = asRecord(approval.request_payload);
    if (
      filters.config_id
      && typeof payload.config_id === "string"
      && payload.config_id !== filters.config_id
    ) {
      continue;
    }
    const requestDateKey = bucketDate(approval.created_at);
    const bucket = approvalBuckets.get(requestDateKey) || new Map<string, number>();
    incrementCount(bucket, "approval_requested");
    approvalBuckets.set(requestDateKey, bucket);
    incrementCount(approvalBreakdown, approval.status);

    if (approval.decided_at && matchesDateRange(approval.decided_at, filters)) {
      const decisionDateKey = bucketDate(approval.decided_at);
      const decisionBucket = approvalBuckets.get(decisionDateKey) || new Map<string, number>();
      incrementCount(decisionBucket, approval.status === "approved" ? "approval_approved" : "approval_rejected");
      approvalBuckets.set(decisionDateKey, decisionBucket);
    }
  }

  for (const event of ((events.data || []) as HeartbeatOperatorEvent[])) {
    if (!matchesDateRange(event.created_at, filters)) {
      continue;
    }

    if (
      event.event_type === "manual_preview"
      || event.event_type === "manual_run"
      || event.event_type === "manual_test"
    ) {
      incrementCount(manualActionBreakdown, event.event_type);
    }
  }

  const topSignals = buildBreakdown(
    runs.reduce((map, run) => {
      for (const signalType of extractSignalTypes(run)) {
        incrementCount(map, signalType);
      }
      return map;
    }, new Map<string, number>()),
    4
  ).map((item) => item.key);

  const avgLatencyByDate = new Map<string, number>();
  for (const [date, value] of latencySums.entries()) {
    avgLatencyByDate.set(date, value.count > 0 ? Math.round(value.total / value.count) : 0);
  }

  return {
    total_runs: runs.length,
    window: {
      date_from: filters.date_from ?? null,
      date_to: filters.date_to ?? null,
    },
    delivery_series: buildSeriesFromBucketMap(deliveryBuckets, [
      "queued",
      "dispatched",
      "suppressed",
      "deferred",
      "awaiting_approval",
    ]),
    signal_series: buildSeriesFromBucketMap(signalBuckets, topSignals),
    approval_series: buildSeriesFromBucketMap(approvalBuckets, [
      "approval_requested",
      "approval_approved",
      "approval_rejected",
    ]),
    latency_series: buildScalarSeries(avgLatencyByDate, "avg_duration_ms", "Avg duration (ms)"),
    token_series: buildScalarSeries(tokenTotals, "tokens", "Tokens"),
    analytics: buildHeartbeatAnalytics(runs, activeIssues),
    approval_breakdown: buildBreakdown(approvalBreakdown, 4),
    manual_action_breakdown: buildBreakdown(manualActionBreakdown, 4),
  };
}

function matchesAuditKind(
  item: HeartbeatAuditItem,
  kind: HeartbeatAuditReportFilters["kind"]
): boolean {
  if (!kind) {
    return true;
  }

  if (kind === "manual_action") {
    return (
      item.kind === "manual_preview"
      || item.kind === "manual_run"
      || item.kind === "manual_test"
    );
  }

  if (kind === "approval") {
    return (
      item.kind === "approval_requested"
      || item.kind === "approval_approved"
      || item.kind === "approval_rejected"
    );
  }

  return item.kind === kind;
}

function buildApprovalSummary(payload: Record<string, unknown>): string {
  const summaries = Array.isArray(payload.signal_summaries)
    ? payload.signal_summaries.filter((value): value is string => typeof value === "string")
    : [];
  if (summaries.length > 0) {
    return summaries.slice(0, 2).join(" | ");
  }

  return "Heartbeat alert approval";
}

export async function fetchHeartbeatAuditReport(
  admin: SupabaseClient,
  tenantId: string,
  filters: HeartbeatAuditReportFilters
): Promise<HeartbeatAuditReport> {
  const [eventsResult, runs, approvals] = await Promise.all([
    admin
      .from("tenant_heartbeat_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1000),
    fetchRunsForTenant(admin, tenantId, {
      config_id: filters.config_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }),
    fetchHeartbeatApprovals(admin, tenantId),
  ]);

  const items: HeartbeatAuditItem[] = [];

  for (const event of ((eventsResult.data || []) as HeartbeatOperatorEvent[])) {
    if (
      event.event_type === "manual_preview"
      || event.event_type === "manual_run"
      || event.event_type === "manual_test"
    ) {
      continue;
    }

    if (filters.config_id && event.config_id !== filters.config_id) {
      continue;
    }
    if (!matchesDateRange(event.created_at, filters)) {
      continue;
    }

    items.push({
      id: `event:${event.id}`,
      occurred_at: event.created_at,
      kind: "operator_event",
      config_id: event.config_id,
      agent_id: event.agent_id,
      title: formatBreakdownLabel(event.event_type),
      summary: event.summary,
      status: null,
      actor_user_id: event.actor_user_id,
      related_run_id:
        typeof event.metadata.heartbeat_run_id === "string"
          ? event.metadata.heartbeat_run_id
          : null,
      related_approval_id:
        typeof event.metadata.approval_id === "string" ? event.metadata.approval_id : null,
      metadata: event.metadata,
    });
  }

  for (const run of runs) {
    if (
      run.trigger_mode !== "manual_preview"
      && run.trigger_mode !== "manual_run"
      && run.trigger_mode !== "manual_test"
    ) {
      continue;
    }

    items.push({
      id: `run:${run.id}`,
      occurred_at: run.ran_at,
      kind: run.trigger_mode,
      config_id: run.config_id,
      agent_id: null,
      title: formatBreakdownLabel(run.trigger_mode),
      summary:
        run.suppressed_reason
        || run.error_message
        || extractSignalTypes(run).join(", ")
        || "Manual heartbeat action",
      status: run.delivery_status,
      actor_user_id: null,
      related_run_id: run.id,
      related_approval_id: null,
      metadata: {
        delivery_status: run.delivery_status,
        suppressed_reason: run.suppressed_reason,
        trigger_mode: run.trigger_mode,
      },
    });
  }

  for (const approval of approvals) {
    const payload = asRecord(approval.request_payload);
    const configId = typeof payload.config_id === "string" ? payload.config_id : null;
    const agentId = typeof payload.agent_id === "string" ? payload.agent_id : null;
    if (filters.config_id && configId !== filters.config_id) {
      continue;
    }

    if (matchesDateRange(approval.created_at, filters)) {
      items.push({
        id: `approval-request:${approval.id}`,
        occurred_at: approval.created_at,
        kind: "approval_requested",
        config_id: configId,
        agent_id: agentId,
        title: "Approval requested",
        summary: buildApprovalSummary(payload),
        status: "pending",
        actor_user_id: approval.requested_by,
        related_run_id:
          typeof payload.heartbeat_run_id === "string" ? payload.heartbeat_run_id : null,
        related_approval_id: approval.id,
        metadata: payload,
      });
    }

    if (
      approval.decided_at
      && (approval.status === "approved" || approval.status === "rejected")
      && matchesDateRange(approval.decided_at, filters)
    ) {
      items.push({
        id: `approval-decision:${approval.id}:${approval.status}`,
        occurred_at: approval.decided_at,
        kind: approval.status === "approved" ? "approval_approved" : "approval_rejected",
        config_id: configId,
        agent_id: agentId,
        title: approval.status === "approved" ? "Approval granted" : "Approval rejected",
        summary: buildApprovalSummary(payload),
        status: approval.status,
        actor_user_id: approval.decided_by,
        related_run_id:
          typeof payload.heartbeat_run_id === "string" ? payload.heartbeat_run_id : null,
        related_approval_id: approval.id,
        metadata: asRecord(approval.decision_payload),
      });
    }
  }

  const queryValue = filters.query?.trim().toLowerCase() || "";
  const filteredItems = items
    .filter((item) => matchesAuditKind(item, filters.kind))
    .filter((item) => {
      if (queryValue.length === 0) {
        return true;
      }

      const haystack = [
        item.title,
        item.summary,
        item.status,
        item.kind,
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" ")
        .toLowerCase();

      return haystack.includes(queryValue);
    })
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at));

  const kindBreakdown = filteredItems.reduce((map, item) => {
    incrementCount(map, item.kind);
    return map;
  }, new Map<string, number>());

  return {
    items: paginate(filteredItems, filters.page, filters.page_size),
    total: filteredItems.length,
    page: filters.page,
    page_size: filters.page_size,
    kind_breakdown: buildBreakdown(kindBreakdown, 8),
  };
}
