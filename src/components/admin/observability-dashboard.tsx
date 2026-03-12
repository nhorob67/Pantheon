"use client";

import type { ObservabilitySnapshot } from "@/lib/queries/admin-observability";

interface ObservabilityDashboardProps {
  snapshot: ObservabilitySnapshot;
}

export function ObservabilityDashboard({
  snapshot,
}: ObservabilityDashboardProps) {
  const errorRate =
    snapshot.runs_last_hour.total > 0
      ? (
          (snapshot.runs_last_hour.failed / snapshot.runs_last_hour.total) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Queue Depth"
          value={snapshot.queue_depth.toString()}
          alert={snapshot.queue_depth > 10}
        />
        <StatCard
          label="Error Rate (1h)"
          value={`${errorRate}%`}
          alert={parseFloat(errorRate) > 5}
        />
        <StatCard
          label="Avg Latency (1h)"
          value={
            snapshot.runs_last_hour.avg_latency_ms > 0
              ? `${(snapshot.runs_last_hour.avg_latency_ms / 1000).toFixed(1)}s`
              : "—"
          }
          alert={snapshot.runs_last_hour.avg_latency_ms > 30_000}
        />
        <StatCard
          label="Token Burn (today)"
          value={`$${(snapshot.token_cost_today_cents / 100).toFixed(2)}`}
          alert={snapshot.token_cost_today_cents > 5000}
        />
      </div>

      {/* Runs Summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
          Last Hour
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Total Runs</p>
            <p className="text-xl font-semibold text-foreground">
              {snapshot.runs_last_hour.total}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Completed</p>
            <p className="text-xl font-semibold text-green-500">
              {snapshot.runs_last_hour.completed}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Failed</p>
            <p className="text-xl font-semibold text-destructive">
              {snapshot.runs_last_hour.failed}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column: Error tenants + Tool usage */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Error Tenants */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
            Top Error Tenants (24h)
          </h3>
          {snapshot.top_error_tenants.length === 0 ? (
            <p className="text-sm text-foreground/40">No errors in 24h</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.top_error_tenants.map((t) => (
                <li
                  key={t.tenant_id}
                  className="flex justify-between text-sm"
                >
                  <span className="font-mono text-foreground/80">
                    {t.tenant_id.slice(0, 8)}...
                  </span>
                  <span className="text-destructive font-medium">
                    {t.error_count} errors
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tool Usage */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em] mb-4">
            Tool Usage (24h)
          </h3>
          {snapshot.tool_usage_24h.length === 0 ? (
            <p className="text-sm text-foreground/40">No tool calls in 24h</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.tool_usage_24h.map((t) => (
                <li
                  key={t.tool_name}
                  className="flex justify-between text-sm"
                >
                  <span className="font-mono text-foreground/80">
                    {t.tool_name}
                  </span>
                  <span className="text-foreground/60">
                    {t.call_count} calls
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 ${
        alert
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-[11px] font-mono text-foreground/60 uppercase tracking-[0.12em]">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${
          alert ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
