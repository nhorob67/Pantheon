"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { HeartbeatActivityData } from "@/lib/queries/heartbeat-activity";
import type {
  HeartbeatAuditItem,
  HeartbeatAuditReport,
  HeartbeatBreakdownItem,
  HeartbeatConfig,
  HeartbeatRun,
  HeartbeatRunsReport,
  HeartbeatSeries,
  HeartbeatTrendsReport,
} from "@/types/heartbeat";

interface Agent {
  id: string;
  display_name: string;
}

interface HeartbeatReportingWorkspaceProps {
  tenantId: string;
  overview: HeartbeatActivityData;
  configs: HeartbeatConfig[];
  agents: Agent[];
}

interface RunsFiltersState {
  config_id: string;
  delivery_status: string;
  trigger_mode: string;
  signal_type: string;
  date_from: string;
  date_to: string;
  query: string;
  page: number;
  page_size: number;
}

interface TrendsFiltersState {
  config_id: string;
  date_from: string;
  date_to: string;
}

interface AuditFiltersState {
  config_id: string;
  kind: string;
  date_from: string;
  date_to: string;
  query: string;
  page: number;
  page_size: number;
}

function buildDateInput(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function buildTodayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatLabel(value: string | null | undefined): string {
  return (value || "unknown").replaceAll("_", " ");
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatShortDate(value: string): string {
  try {
    return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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

function extractSignalTypes(run: HeartbeatRun): string[] {
  const decisionTrace = asRecord(run.decision_trace);
  const selected = asStringArray(decisionTrace.selected_signal_types);
  if (selected.length > 0) {
    return selected;
  }

  return asStringArray(decisionTrace.signal_types);
}

function formatRunLabel(run: HeartbeatRun): string {
  if (run.error_message) {
    return run.error_message;
  }

  if (run.delivery_status === "suppressed") {
    return run.suppressed_reason
      ? `Suppressed: ${formatLabel(run.suppressed_reason)}`
      : "Alert suppressed";
  }

  if (run.delivery_status === "deferred") {
    return run.suppressed_reason
      ? `Deferred: ${formatLabel(run.suppressed_reason)}`
      : "Alert deferred";
  }

  if (run.delivery_status === "awaiting_approval") {
    return "Awaiting approval";
  }

  if (run.delivery_status === "preview") {
    return run.had_signal ? "Preview generated" : "Preview had no alert";
  }

  if (run.delivery_status === "dispatched") {
    return "Alert dispatched";
  }

  if (run.delivery_status === "queued") {
    return "Alert queued";
  }

  if (run.delivery_status === "dispatch_failed") {
    return "Dispatch failed";
  }

  return run.had_signal ? "Signal detected" : "All clear";
}

function formatScopeLabel(
  configId: string | null,
  agentId: string | null,
  configById: Map<string, HeartbeatConfig>,
  agentNameById: Map<string, string>
): string {
  const resolvedAgentId = agentId ?? (configId ? configById.get(configId)?.agent_id ?? null : null);
  if (resolvedAgentId) {
    return agentNameById.get(resolvedAgentId) || "Agent override";
  }

  return "Tenant default";
}

function buildReportUrl(
  tenantId: string,
  mode: "runs" | "trends" | "audit",
  params: Record<string, string | number | undefined>
): string {
  const search = new URLSearchParams({ mode });
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  return `/api/tenants/${tenantId}/heartbeat/activity?${search.toString()}`;
}

async function fetchReport<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "GET", signal });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      (body.error as { message?: string } | undefined)?.message
        || (typeof body.error === "string" ? body.error : "Failed to load report")
    );
  }

  return body as T;
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
  loading,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  loading: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs text-foreground/60">
      <div>
        Page {page} of {totalPages} · {total} item{total === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: HeartbeatBreakdownItem[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/55">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-foreground/40">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground/70">{item.label}</span>
              <span className="font-medium text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeriesCard({
  title,
  series,
}: {
  title: string;
  series: HeartbeatSeries[];
}) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((entry) => entry.points.map((point) => point.value))
  );

  if (series.length === 0 || series.every((entry) => entry.points.length === 0)) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/55">{title}</h4>
        <p className="mt-3 text-xs text-foreground/40">No data in this window.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/55">{title}</h4>
      <div className="mt-4 space-y-4">
        {series.map((entry) => (
          <div key={entry.key}>
            <div className="mb-2 text-sm font-medium text-foreground">{entry.label}</div>
            <div className="space-y-2">
              {entry.points.map((point) => (
                <div key={`${entry.key}:${point.date}`} className="grid grid-cols-[70px_minmax(0,1fr)_40px] items-center gap-2 text-xs">
                  <span className="text-foreground/50">{formatShortDate(point.date)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-[#D98C2E]"
                      style={{ width: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <span className="text-right font-medium text-foreground">{point.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeartbeatReportingWorkspace({
  tenantId,
  overview,
  configs,
  agents,
}: HeartbeatReportingWorkspaceProps) {
  const tabs = useMemo(
    () => [
      { value: "runs", label: "Runs" },
      { value: "trends", label: "Trends" },
      { value: "audit", label: "Audit" },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState("runs");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(overview.recentRuns[0]?.id ?? null);

  const [runsFilters, setRunsFilters] = useState<RunsFiltersState>({
    config_id: "all",
    delivery_status: "all",
    trigger_mode: "all",
    signal_type: "all",
    date_from: buildDateInput(14),
    date_to: buildTodayInput(),
    query: "",
    page: 1,
    page_size: 20,
  });
  const [trendsFilters, setTrendsFilters] = useState<TrendsFiltersState>({
    config_id: "all",
    date_from: buildDateInput(30),
    date_to: buildTodayInput(),
  });
  const [auditFilters, setAuditFilters] = useState<AuditFiltersState>({
    config_id: "all",
    kind: "all",
    date_from: buildDateInput(30),
    date_to: buildTodayInput(),
    query: "",
    page: 1,
    page_size: 20,
  });

  const deferredRunsQuery = useDeferredValue(runsFilters.query);
  const deferredAuditQuery = useDeferredValue(auditFilters.query);

  const [runsData, setRunsData] = useState<HeartbeatRunsReport | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);

  const [trendsData, setTrendsData] = useState<HeartbeatTrendsReport | null>(null);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [auditData, setAuditData] = useState<HeartbeatAuditReport | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const configById = useMemo(
    () => new Map(configs.map((config) => [config.id, config])),
    [configs]
  );
  const agentNameById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.display_name])),
    [agents]
  );

  const configOptions = useMemo(
    () => [
      { value: "all", label: "All configs" },
      ...configs.map((config) => ({
        value: config.id,
        label: formatScopeLabel(config.id, config.agent_id, configById, agentNameById),
      })),
    ],
    [agentNameById, configById, configs]
  );

  useEffect(() => {
    if (activeTab !== "runs") {
      return;
    }

    const controller = new AbortController();

    void fetchReport<HeartbeatRunsReport>(
      buildReportUrl(tenantId, "runs", {
        config_id: runsFilters.config_id,
        delivery_status: runsFilters.delivery_status === "all" ? undefined : runsFilters.delivery_status,
        trigger_mode: runsFilters.trigger_mode === "all" ? undefined : runsFilters.trigger_mode,
        signal_type: runsFilters.signal_type === "all" ? undefined : runsFilters.signal_type,
        date_from: runsFilters.date_from,
        date_to: runsFilters.date_to,
        query: deferredRunsQuery || undefined,
        page: runsFilters.page,
        page_size: runsFilters.page_size,
      }),
      controller.signal
    )
      .then((data) => {
        setRunsData(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setRunsError(error instanceof Error ? error.message : "Failed to load runs");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRunsLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeTab,
    deferredRunsQuery,
    runsFilters.config_id,
    runsFilters.date_from,
    runsFilters.date_to,
    runsFilters.delivery_status,
    runsFilters.page,
    runsFilters.page_size,
    runsFilters.signal_type,
    runsFilters.trigger_mode,
    tenantId,
  ]);

  useEffect(() => {
    if (activeTab !== "trends") {
      return;
    }

    const controller = new AbortController();

    void fetchReport<HeartbeatTrendsReport>(
      buildReportUrl(tenantId, "trends", {
        config_id: trendsFilters.config_id,
        date_from: trendsFilters.date_from,
        date_to: trendsFilters.date_to,
      }),
      controller.signal
    )
      .then((data) => {
        setTrendsData(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setTrendsError(error instanceof Error ? error.message : "Failed to load trends");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTrendsLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeTab,
    tenantId,
    trendsFilters.config_id,
    trendsFilters.date_from,
    trendsFilters.date_to,
  ]);

  useEffect(() => {
    if (activeTab !== "audit") {
      return;
    }

    const controller = new AbortController();

    void fetchReport<HeartbeatAuditReport>(
      buildReportUrl(tenantId, "audit", {
        config_id: auditFilters.config_id,
        kind: auditFilters.kind === "all" ? undefined : auditFilters.kind,
        date_from: auditFilters.date_from,
        date_to: auditFilters.date_to,
        query: deferredAuditQuery || undefined,
        page: auditFilters.page,
        page_size: auditFilters.page_size,
      }),
      controller.signal
    )
      .then((data) => {
        setAuditData(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setAuditError(error instanceof Error ? error.message : "Failed to load audit history");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAuditLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeTab,
    auditFilters.config_id,
    auditFilters.date_from,
    auditFilters.date_to,
    auditFilters.kind,
    auditFilters.page,
    auditFilters.page_size,
    deferredAuditQuery,
    tenantId,
  ]);

  const selectedRun = useMemo(
    () => {
      if (!runsData || runsData.runs.length === 0) {
        return null;
      }

      return runsData.runs.find((run) => run.id === selectedRunId) ?? runsData.runs[0] ?? null;
    },
    [runsData, selectedRunId]
  );

  const selectedRunDecisionTrace = asRecord(selectedRun?.decision_trace);
  const selectedRunFreshness = asRecord(selectedRun?.freshness_metadata);
  const selectedRunDispatch = asRecord(selectedRun?.dispatch_metadata);

  const runsSignalOptions = useMemo(
    () => [
      { value: "all", label: "All signal types" },
      ...((runsData?.available_signal_types || []).map((signalType) => ({
        value: signalType,
        label: formatLabel(signalType),
      }))),
    ],
    [runsData?.available_signal_types]
  );

  const openRunFromAudit = (item: HeartbeatAuditItem) => {
    if (!item.related_run_id) {
      return;
    }

    setRunsFilters((current) => ({
      ...current,
      query: item.related_run_id || "",
      page: 1,
    }));
    setSelectedRunId(item.related_run_id);
    setActiveTab("runs");
    setRunsLoading(true);
    setRunsError(null);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-base font-semibold">Reporting</h3>
          <p className="mt-1 text-xs text-foreground/50">
            Debug individual heartbeat runs, track tenant-level trends, and audit operator actions from one workspace.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <div className="text-foreground/45">Today runs</div>
            <div className="mt-1 font-medium text-foreground">{overview.stats.today_runs}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <div className="text-foreground/45">Signals</div>
            <div className="mt-1 font-medium text-foreground">{overview.stats.today_signals}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <div className="text-foreground/45">Deferred</div>
            <div className="mt-1 font-medium text-foreground">{overview.stats.today_deferred}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <div className="text-foreground/45">Awaiting approval</div>
            <div className="mt-1 font-medium text-foreground">{overview.stats.today_awaiting_approval}</div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(value) => {
          setActiveTab(value);
          if (value === "runs") {
            setRunsLoading(true);
            setRunsError(null);
          } else if (value === "trends") {
            setTrendsLoading(true);
            setTrendsError(null);
          } else if (value === "audit") {
            setAuditLoading(true);
            setAuditError(null);
          }
        }}
      />

      {activeTab === "runs" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select
              label="Config"
              options={configOptions}
              value={runsFilters.config_id}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  config_id: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Select
              label="Status"
              options={[
                { value: "all", label: "All statuses" },
                { value: "queued", label: "Queued" },
                { value: "dispatched", label: "Dispatched" },
                { value: "suppressed", label: "Suppressed" },
                { value: "deferred", label: "Deferred" },
                { value: "awaiting_approval", label: "Awaiting approval" },
                { value: "dispatch_failed", label: "Dispatch failed" },
                { value: "preview", label: "Preview" },
                { value: "not_applicable", label: "Not applicable" },
              ]}
              value={runsFilters.delivery_status}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  delivery_status: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Select
              label="Trigger"
              options={[
                { value: "all", label: "All triggers" },
                { value: "scheduled", label: "Scheduled" },
                { value: "manual_run", label: "Manual run" },
                { value: "manual_preview", label: "Manual preview" },
                { value: "manual_test", label: "Manual test" },
              ]}
              value={runsFilters.trigger_mode}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  trigger_mode: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Select
              label="Signal"
              options={runsSignalOptions}
              value={runsFilters.signal_type}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  signal_type: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Input
              label="From"
              type="date"
              value={runsFilters.date_from}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  date_from: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Input
              label="To"
              type="date"
              value={runsFilters.date_to}
              onChange={(event) => {
                setRunsLoading(true);
                setRunsError(null);
                setRunsFilters((current) => ({
                  ...current,
                  date_to: event.target.value,
                  page: 1,
                }));
              }}
            />
          </div>

          <Input
            label="Search"
            placeholder="Search run id, suppression reason, error, or signal type"
            value={runsFilters.query}
            onChange={(event) => {
              setRunsLoading(true);
              setRunsError(null);
              setRunsFilters((current) => ({
                ...current,
                query: event.target.value,
                page: 1,
              }));
            }}
          />

          {runsError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {runsError}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="rounded-xl border border-border/70 bg-muted/10">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-xs text-foreground/55">
                <span>Filtered runs</span>
                {runsLoading && (
                  <span className="inline-flex items-center gap-2 text-foreground/45">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading
                  </span>
                )}
              </div>
              {runsData && runsData.runs.length === 0 && !runsLoading ? (
                <div className="p-4 text-sm text-foreground/55">No runs matched these filters.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {(runsData?.runs || []).map((run) => {
                    const isSelected = run.id === selectedRunId;
                    const signalTypes = extractSignalTypes(run);
                    return (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => setSelectedRunId(run.id)}
                        className={`block w-full px-4 py-4 text-left transition-colors ${
                          isSelected ? "bg-[#D98C2E]/10" : "hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">
                            {formatScopeLabel(run.config_id, null, configById, agentNameById)}
                          </span>
                          <span className="text-foreground/45">{formatDateTime(run.ran_at)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">
                            {formatLabel(run.delivery_status)}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/60">
                            {formatLabel(run.trigger_mode)}
                          </span>
                          {signalTypes.slice(0, 2).map((signalType) => (
                            <span
                              key={`${run.id}:${signalType}`}
                              className="inline-flex items-center rounded-full bg-[#5a8a3c]/10 px-2 py-0.5 font-medium text-[#5a8a3c]"
                            >
                              {formatLabel(signalType)}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-sm text-foreground/80">{formatRunLabel(run)}</div>
                        <div className="mt-2 text-[11px] text-foreground/45">
                          Run id {run.id}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
              <div className="text-xs uppercase tracking-wide text-foreground/45">Run inspector</div>
              {!selectedRun ? (
                <p className="mt-3 text-sm text-foreground/55">Select a run to inspect its decision trace and delivery context.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatRunLabel(selectedRun)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/65">
                        {formatLabel(selectedRun.delivery_status)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-foreground/50">
                      {formatDateTime(selectedRun.ran_at)} · {formatScopeLabel(selectedRun.config_id, null, configById, agentNameById)}
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs text-foreground/60 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-card p-3">
                      <div className="text-foreground/45">Trigger</div>
                      <div className="mt-1 font-medium text-foreground">{formatLabel(selectedRun.trigger_mode)}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card p-3">
                      <div className="text-foreground/45">Duration</div>
                      <div className="mt-1 font-medium text-foreground">{formatDuration(selectedRun.duration_ms)}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card p-3">
                      <div className="text-foreground/45">LLM invoked</div>
                      <div className="mt-1 font-medium text-foreground">{selectedRun.llm_invoked ? "Yes" : "No"}</div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card p-3">
                      <div className="text-foreground/45">Runtime run</div>
                      <div className="mt-1 font-medium text-foreground break-all">
                        {selectedRun.runtime_run_id || "None"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-card p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-foreground/45">
                      Checks and durations
                    </div>
                    <div className="mt-3 space-y-2">
                      {Object.entries(selectedRun.checks_executed || {}).map(([key, result]) => (
                        <div key={key} className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <div className="font-medium text-foreground">{formatLabel(key)}</div>
                            <div className="text-foreground/55">
                              {typeof result.summary === "string" && result.summary.length > 0
                                ? result.summary
                                : formatLabel(result.status)}
                            </div>
                          </div>
                          <div className="text-right text-foreground/45">
                            <div>{formatLabel(result.status)}</div>
                            <div>{formatDuration(selectedRun.check_durations[key] ?? null)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-card p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-foreground/45">
                      Decision trace
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-foreground/60">
                      <div>Selected signals: {asStringArray(selectedRunDecisionTrace.selected_signal_types).map(formatLabel).join(", ") || "None"}</div>
                      <div>Attention types: {asStringArray(selectedRunDecisionTrace.selected_attention_types).map(formatLabel).join(", ") || "None"}</div>
                      <div>Final reason: {formatLabel(typeof selectedRunDecisionTrace.final_reason === "string" ? selectedRunDecisionTrace.final_reason : "none")}</div>
                      <div>Busy runtime reason: {formatLabel(typeof selectedRunDecisionTrace.busy_runtime_reason === "string" ? selectedRunDecisionTrace.busy_runtime_reason : "none")}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-card p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-foreground/45">
                      Freshness and dispatch
                    </div>
                    <div className="mt-3 space-y-3 text-xs text-foreground/60">
                      <div>
                        Output excerpt: {typeof asRecord(selectedRunDispatch.output_ref).output_excerpt === "string"
                          ? String(asRecord(selectedRunDispatch.output_ref).output_excerpt)
                          : "None"}
                      </div>
                      <div>
                        Approval reason: {typeof asRecord(selectedRunDispatch.approval_ref).approval_reason === "string"
                          ? formatLabel(String(asRecord(selectedRunDispatch.approval_ref).approval_reason))
                          : "None"}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <pre className="overflow-auto rounded-lg bg-background p-3 text-[11px] text-foreground/65">
{JSON.stringify(selectedRunFreshness, null, 2)}
                        </pre>
                        <pre className="overflow-auto rounded-lg bg-background p-3 text-[11px] text-foreground/65">
{JSON.stringify(selectedRunDispatch, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Pagination
            page={runsData?.page || runsFilters.page}
            total={runsData?.total || 0}
            pageSize={runsData?.page_size || runsFilters.page_size}
            loading={runsLoading}
            onChange={(page) => {
              setRunsLoading(true);
              setRunsError(null);
              setRunsFilters((current) => ({ ...current, page }));
            }}
          />
        </div>
      )}

      {activeTab === "trends" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Config"
              options={configOptions}
              value={trendsFilters.config_id}
              onChange={(event) => {
                setTrendsLoading(true);
                setTrendsError(null);
                setTrendsFilters((current) => ({
                  ...current,
                  config_id: event.target.value,
                }));
              }}
            />
            <Input
              label="From"
              type="date"
              value={trendsFilters.date_from}
              onChange={(event) => {
                setTrendsLoading(true);
                setTrendsError(null);
                setTrendsFilters((current) => ({
                  ...current,
                  date_from: event.target.value,
                }));
              }}
            />
            <Input
              label="To"
              type="date"
              value={trendsFilters.date_to}
              onChange={(event) => {
                setTrendsLoading(true);
                setTrendsError(null);
                setTrendsFilters((current) => ({
                  ...current,
                  date_to: event.target.value,
                }));
              }}
            />
          </div>

          {trendsError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {trendsError}
            </div>
          )}

          {trendsLoading && !trendsData ? (
            <div className="flex items-center gap-2 text-sm text-foreground/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading trends
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-foreground/45">Runs in window</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{trendsData?.total_runs || 0}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-foreground/45">Avg duration</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatDuration(trendsData?.analytics.avg_duration_ms ?? null)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-foreground/45">P95 duration</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatDuration(trendsData?.analytics.p95_duration_ms ?? null)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs text-foreground/45">Avg tokens / LLM run</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {trendsData?.analytics.avg_tokens_per_llm_run ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SeriesCard title="Delivery outcomes over time" series={trendsData?.delivery_series || []} />
                <SeriesCard title="Top signals over time" series={trendsData?.signal_series || []} />
                <SeriesCard title="Approval flow over time" series={trendsData?.approval_series || []} />
                <SeriesCard title="Latency and tokens" series={[
                  ...(trendsData?.latency_series || []),
                  ...(trendsData?.token_series || []),
                ]} />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <BreakdownList
                  title="Suppression reasons"
                  items={trendsData?.analytics.suppression_breakdown || []}
                  emptyLabel="No suppressions in this window."
                />
                <BreakdownList
                  title="Defer reasons"
                  items={trendsData?.analytics.defer_breakdown || []}
                  emptyLabel="No deferrals in this window."
                />
                <BreakdownList
                  title="Issue age"
                  items={trendsData?.analytics.issue_age_breakdown || []}
                  emptyLabel="No active issues."
                />
                <BreakdownList
                  title="Approval outcomes"
                  items={trendsData?.approval_breakdown || []}
                  emptyLabel="No heartbeat approvals in this window."
                />
                <BreakdownList
                  title="Manual actions"
                  items={trendsData?.manual_action_breakdown || []}
                  emptyLabel="No manual heartbeat actions in this window."
                />
                <BreakdownList
                  title="Guardrail blocks"
                  items={trendsData?.analytics.guardrail_breakdown || []}
                  emptyLabel="No guardrail blocks in this window."
                />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select
              label="Config"
              options={configOptions}
              value={auditFilters.config_id}
              onChange={(event) => {
                setAuditLoading(true);
                setAuditError(null);
                setAuditFilters((current) => ({
                  ...current,
                  config_id: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Select
              label="Kind"
              options={[
                { value: "all", label: "All activity" },
                { value: "operator_event", label: "Operator changes" },
                { value: "manual_action", label: "Manual actions" },
                { value: "approval", label: "Approvals" },
                { value: "approval_requested", label: "Approval requested" },
                { value: "approval_approved", label: "Approval approved" },
                { value: "approval_rejected", label: "Approval rejected" },
              ]}
              value={auditFilters.kind}
              onChange={(event) => {
                setAuditLoading(true);
                setAuditError(null);
                setAuditFilters((current) => ({
                  ...current,
                  kind: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Input
              label="Search"
              placeholder="Search summary or status"
              value={auditFilters.query}
              onChange={(event) => {
                setAuditLoading(true);
                setAuditError(null);
                setAuditFilters((current) => ({
                  ...current,
                  query: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Input
              label="From"
              type="date"
              value={auditFilters.date_from}
              onChange={(event) => {
                setAuditLoading(true);
                setAuditError(null);
                setAuditFilters((current) => ({
                  ...current,
                  date_from: event.target.value,
                  page: 1,
                }));
              }}
            />
            <Input
              label="To"
              type="date"
              value={auditFilters.date_to}
              onChange={(event) => {
                setAuditLoading(true);
                setAuditError(null);
                setAuditFilters((current) => ({
                  ...current,
                  date_to: event.target.value,
                  page: 1,
                }));
              }}
            />
          </div>

          {auditError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {auditError}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
              {auditLoading && !auditData ? (
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading audit history
                </div>
              ) : auditData && auditData.items.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground/55">
                  No audit entries matched these filters.
                </div>
              ) : (
                <>
                  {(auditData?.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/70 bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{item.title}</span>
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/65">
                              {formatLabel(item.kind)}
                            </span>
                            {item.status && (
                              <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/10 px-2 py-0.5 text-[11px] font-medium text-[#5a8a3c]">
                                {formatLabel(item.status)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-foreground/80">{item.summary}</div>
                          <div className="mt-2 text-xs text-foreground/50">
                            {formatScopeLabel(item.config_id, item.agent_id, configById, agentNameById)} · {formatDateTime(item.occurred_at)}
                          </div>
                        </div>
                        {item.related_run_id && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openRunFromAudit(item)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Inspect run
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <Pagination
                    page={auditData?.page || auditFilters.page}
                    total={auditData?.total || 0}
                    pageSize={auditData?.page_size || auditFilters.page_size}
                    loading={auditLoading}
                    onChange={(page) => {
                      setAuditLoading(true);
                      setAuditError(null);
                      setAuditFilters((current) => ({ ...current, page }));
                    }}
                  />
                </>
              )}
            </div>

            <BreakdownList
              title="Audit breakdown"
              items={auditData?.kind_breakdown || []}
              emptyLabel="No audit entries in this window."
            />
          </div>
        </div>
      )}
    </div>
  );
}
