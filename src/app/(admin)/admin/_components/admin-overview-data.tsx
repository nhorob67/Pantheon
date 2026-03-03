import { createAdminClient } from "@/lib/supabase/admin";
import { formatMRR, formatPercentage } from "@/lib/utils/format";
import { StatsGrid } from "@/components/admin/stats-grid";
import { AdminOverviewCharts } from "@/components/admin/overview-charts";
import {
  getExtensibilityTelemetry,
  getFleetHealth,
  getRevenueBreakdown,
} from "@/lib/queries/admin-analytics";

async function getAdminData() {
  const admin = createAdminClient();

  const [
    { count: totalCustomers },
    { count: activeInstances },
    { count: totalInstances },
    { count: activeSubscriptions },
    fleetHealth,
    revenueBreakdown,
    extensibilityTelemetry,
  ] = await Promise.all([
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin
      .from("instances")
      .select("id", { count: "exact", head: true })
      .eq("status", "running"),
    admin.from("instances").select("id", { count: "exact", head: true }),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "active"),
    getFleetHealth(admin),
    getRevenueBreakdown(admin),
    getExtensibilityTelemetry(admin),
  ]);

  const mrr = (activeSubscriptions || 0) * 5000;
  const healthPercent =
    (totalInstances || 0) > 0
      ? ((activeInstances || 0) / (totalInstances || 0)) * 100
      : 0;

  return {
    totalCustomers: totalCustomers || 0,
    activeInstances: activeInstances || 0,
    mrr,
    healthPercent,
    fleetHealth,
    revenueBreakdown,
    extensibilityTelemetry,
  };
}

export async function AdminOverviewData() {
  const data = await getAdminData();

  return (
    <>
      <StatsGrid
        totalCustomers={data.totalCustomers}
        activeInstances={data.activeInstances}
        mrr={formatMRR(data.mrr)}
        fleetHealth={formatPercentage(data.healthPercent)}
      />

      <AdminOverviewCharts
        health={data.fleetHealth}
        revenue={data.revenueBreakdown}
      />

      <div className="bg-card rounded-xl border border-energy/30 shadow-sm p-6">
        <h3 className="font-headline text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Extensibility Telemetry (Last 24h)
        </h3>

        <div className="grid gap-3 md:grid-cols-4 mb-5">
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Events</p>
            <p className="text-xl font-semibold text-foreground">
              {data.extensibilityTelemetry.last_24h.total_events}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Errors</p>
            <p className="text-xl font-semibold text-foreground">
              {data.extensibilityTelemetry.last_24h.error_events}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">Error Rate</p>
            <p className="text-xl font-semibold text-foreground">
              {formatPercentage(data.extensibilityTelemetry.last_24h.error_rate_percent)}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-foreground/60">P95 Latency</p>
            <p className="text-xl font-semibold text-foreground">
              {data.extensibilityTelemetry.last_24h.p95_latency_ms === null
                ? "—"
                : `${data.extensibilityTelemetry.last_24h.p95_latency_ms}ms`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-2">
              Top Event Types (7d)
            </p>
            <ul className="space-y-1 text-sm">
              {data.extensibilityTelemetry.top_event_types.length === 0 && (
                <li className="text-foreground/60">No telemetry data yet.</li>
              )}
              {data.extensibilityTelemetry.top_event_types.map((entry) => (
                <li key={entry.key} className="flex justify-between gap-3">
                  <span className="text-foreground/80">{entry.key}</span>
                  <span className="text-foreground/60">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-2">
              Top Tools (7d)
            </p>
            <ul className="space-y-1 text-sm">
              {data.extensibilityTelemetry.top_tools.length === 0 && (
                <li className="text-foreground/60">No telemetry data yet.</li>
              )}
              {data.extensibilityTelemetry.top_tools.map((entry) => (
                <li key={entry.key} className="flex justify-between gap-3">
                  <span className="text-foreground/80">{entry.key}</span>
                  <span className="text-foreground/60">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-energy/30 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-sm font-semibold text-foreground uppercase tracking-wider">
            Runtime Observability
          </h3>
          <a
            href="/admin/observability"
            className="text-sm text-primary hover:underline"
          >
            Open Dashboard &rarr;
          </a>
        </div>
        <p className="text-sm text-foreground/60">
          Monitor queue depth, error rates, latency, and token burn across all tenants.
        </p>
      </div>
    </>
  );
}
