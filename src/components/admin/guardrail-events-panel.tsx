"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GuardrailSnapshot, GuardrailEventRow, GuardrailAnalytics } from "@/lib/queries/admin-guardrails";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  loop_warning: "Loop Warning",
  loop_hard_stop: "Loop Hard Stop",
  budget_tool_invocations: "Tool Budget",
  budget_elapsed_time: "Time Budget",
  budget_tokens: "Token Budget",
  budget_spend: "Spend Budget",
  budget_browser_actions: "Browser Budget",
  budget_browser_session_time: "Browser Session",
  ping_pong_detected: "Ping-Pong",
  browser_no_progress: "Browser No-Progress",
  delegation_recursion: "Delegation Recursion",
};

const KIND_COLORS: Record<string, string> = {
  loop_warning: "text-amber-400",
  loop_hard_stop: "text-red-400",
  budget_tool_invocations: "text-orange-400",
  budget_elapsed_time: "text-orange-400",
  budget_tokens: "text-orange-400",
  budget_spend: "text-red-400",
  budget_browser_actions: "text-orange-400",
  budget_browser_session_time: "text-orange-400",
  ping_pong_detected: "text-red-400",
  browser_no_progress: "text-amber-400",
  delegation_recursion: "text-red-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  snapshot: GuardrailSnapshot;
  analytics?: GuardrailAnalytics | null;
}

export function GuardrailEventsPanel({ snapshot, analytics }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Events (24h)"
          value={snapshot.total_events_24h.toString()}
          icon={Shield}
          alert={false}
        />
        <StatCard
          label="Halts (24h)"
          value={snapshot.halts_24h.toString()}
          icon={ShieldAlert}
          alert={snapshot.halts_24h > 0}
        />
        <StatCard
          label="Warnings (24h)"
          value={snapshot.warnings_24h.toString()}
          icon={AlertTriangle}
          alert={snapshot.warnings_24h > 10}
        />
      </div>

      {/* Two column: Event kinds + Halted tenants */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Event Kinds */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
            Event Breakdown (24h)
          </h3>
          {snapshot.top_event_kinds.length === 0 ? (
            <p className="text-sm text-foreground/40">No guardrail events in 24h</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.top_event_kinds.map((k) => (
                <li key={k.event_kind} className="flex justify-between text-sm">
                  <span className={`font-mono ${KIND_COLORS[k.event_kind] ?? "text-foreground/80"}`}>
                    {KIND_LABELS[k.event_kind] ?? k.event_kind}
                  </span>
                  <span className="text-foreground/60">{k.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Halted Tenants */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
            Most Halted Tenants (24h)
          </h3>
          {snapshot.top_halted_tenants.length === 0 ? (
            <p className="text-sm text-foreground/40">No halted runs in 24h</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.top_halted_tenants.map((t) => (
                <li key={t.tenant_id} className="flex justify-between text-sm">
                  <span className="font-mono text-foreground/80">
                    {t.tenant_id.slice(0, 8)}...
                  </span>
                  <span className="text-destructive font-medium">
                    {t.halt_count} halt{t.halt_count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Phase 6.3: Analytics Section */}
      {analytics && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <p className="text-[11px] font-mono text-foreground/60 uppercase tracking-[0.12em] mb-1">
                False Positive Rate (7d)
              </p>
              <p className="text-2xl font-bold text-foreground">
                {(analytics.falsePositiveProxy.rate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                {analytics.falsePositiveProxy.haltedRunsThatSucceeded} of{" "}
                {analytics.falsePositiveProxy.totalHaltedRuns} halted runs still succeeded
              </p>
            </div>
            <div className="bg-card rounded-xl border border-emerald-500/20 shadow-sm p-4">
              <p className="text-[11px] font-mono text-foreground/60 uppercase tracking-[0.12em] mb-1">
                Est. Cost Savings (7d)
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                ${(analytics.estimatedCostSavings.estimatedSavedCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                {analytics.estimatedCostSavings.haltedRunCount} runs prevented
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <p className="text-[11px] font-mono text-foreground/60 uppercase tracking-[0.12em] mb-1">
                Top Trigger (7d)
              </p>
              <p className="text-lg font-bold text-foreground">
                {analytics.kindFrequency[0]
                  ? KIND_LABELS[analytics.kindFrequency[0].event_kind] ??
                    analytics.kindFrequency[0].event_kind
                  : "None"}
              </p>
              {analytics.kindFrequency[0] && (
                <p className="text-xs text-foreground/40 mt-1">
                  {analytics.kindFrequency[0].count} occurrences
                </p>
              )}
            </div>
          </div>

          {/* Trigger Frequency Breakdown */}
          {analytics.kindFrequency.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
                Trigger Frequency (7d)
              </h3>
              <div className="space-y-2">
                {analytics.kindFrequency.map((k) => {
                  const max = analytics.kindFrequency[0]?.count ?? 1;
                  const pct = Math.round((k.count / max) * 100);
                  return (
                    <div key={k.event_kind} className="flex items-center gap-3">
                      <span className={`text-xs font-mono w-40 shrink-0 ${KIND_COLORS[k.event_kind] ?? "text-foreground/80"}`}>
                        {KIND_LABELS[k.event_kind] ?? k.event_kind}
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            k.event_kind.includes("halt") || k.event_kind.includes("recursion") || k.event_kind === "ping_pong_detected"
                              ? "bg-red-400/60"
                              : "bg-amber-400/60"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground/50 w-10 text-right">
                        {k.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Trend */}
          {analytics.dailyHaltTrend.length > 1 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
                Daily Halt/Warn Trend
              </h3>
              <div className="flex items-end gap-1 h-20">
                {analytics.dailyHaltTrend.map((day) => {
                  const total = day.halt_count + day.warn_count;
                  const maxTotal = Math.max(
                    ...analytics.dailyHaltTrend.map(
                      (d) => d.halt_count + d.warn_count
                    ),
                    1
                  );
                  const heightPct = Math.round((total / maxTotal) * 100);
                  const haltPct =
                    total > 0
                      ? Math.round((day.halt_count / total) * 100)
                      : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col justify-end"
                      title={`${day.date}: ${day.halt_count} halts, ${day.warn_count} warns`}
                    >
                      <div
                        className="w-full rounded-sm overflow-hidden"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      >
                        <div
                          className="bg-red-400/60"
                          style={{ height: `${haltPct}%` }}
                        />
                        <div
                          className="bg-amber-400/40"
                          style={{ height: `${100 - haltPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-foreground/30 text-center mt-1 block">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-foreground/40">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-red-400/60" /> Halts
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-amber-400/40" /> Warnings
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Events Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em]">
            Recent Guardrail Events
          </h3>
        </div>

        {snapshot.recent_events.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-foreground/40">
            No guardrail events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {snapshot.recent_events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                expanded={expandedRows.has(event.id)}
                onToggle={toggleRow}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string;
  icon: typeof Shield;
  alert: boolean;
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 ${
        alert ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${alert ? "text-destructive" : "text-foreground/40"}`} />
        <p className="text-[11px] font-mono text-foreground/60 uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function EventRow({
  event,
  expanded,
  onToggle,
}: {
  event: GuardrailEventRow;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const kindColor = KIND_COLORS[event.event_kind] ?? "text-foreground/80";
  const isHalt = event.action === "halt";

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(event.id)}
        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
        )}

        <Badge variant={isHalt ? "error" : "neutral"}>
          {event.action}
        </Badge>

        <span className={`text-xs font-mono ${kindColor}`}>
          {KIND_LABELS[event.event_kind] ?? event.event_kind}
        </span>

        {event.tool_name && (
          <span className="text-xs text-foreground/50">
            {event.tool_name}
          </span>
        )}

        <span className="ml-auto text-xs text-foreground/30 shrink-0">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-4 ml-8">
          <div className="rounded-lg border border-border bg-background p-3 text-xs space-y-2">
            <p className="text-foreground/80">{event.message}</p>
            <div className="grid grid-cols-2 gap-2 text-foreground/50">
              <div>
                <span className="text-foreground/30">Threshold:</span>{" "}
                {event.threshold}
              </div>
              <div>
                <span className="text-foreground/30">Actual:</span>{" "}
                {event.actual}
              </div>
              <div>
                <span className="text-foreground/30">Tenant:</span>{" "}
                <span className="font-mono">{event.tenant_id.slice(0, 8)}...</span>
              </div>
              <div>
                <span className="text-foreground/30">Run:</span>{" "}
                <span className="font-mono">{event.run_id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
