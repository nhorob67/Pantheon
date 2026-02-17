import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { StatsGrid } from "@/components/admin/stats-grid";
import { formatMRR, formatPercentage } from "@/lib/utils/format";
import { AdminOverviewCharts } from "@/components/admin/overview-charts";
import {
  getExtensibilityTelemetry,
  getFleetHealth,
  getRevenueBreakdown,
} from "@/lib/queries/admin-analytics";

interface StaleInstance {
  id: string;
  email: string | null;
  last_health_check: string | null;
}

function getRelatedCustomerEmail(value: unknown): string | null {
  const record =
    Array.isArray(value) && value.length > 0
      ? value[0]
      : value;

  if (!record || typeof record !== "object") {
    return null;
  }

  const email = (record as { email?: unknown }).email;
  return typeof email === "string" ? email : null;
}

async function getAdminData() {
  const admin = createAdminClient();

  const [
    { count: totalCustomers },
    { count: activeInstances },
    { count: totalInstances },
    { count: activeSubscriptions },
    { data: runningInstances },
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
    admin
      .from("instances")
      .select("id, customer_id, last_health_check, customers(email)")
      .eq("status", "running"),
    getFleetHealth(admin),
    getRevenueBreakdown(admin),
    getExtensibilityTelemetry(admin),
  ]);

  const mrr = (activeSubscriptions || 0) * 4000;
  const healthPercent =
    (totalInstances || 0) > 0
      ? ((activeInstances || 0) / (totalInstances || 0)) * 100
      : 0;

  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const staleInstances: StaleInstance[] = (runningInstances || [])
    .filter((inst) => {
      if (!inst.last_health_check) return true;
      return now - new Date(inst.last_health_check).getTime() > oneHourMs;
    })
    .map((inst) => ({
      id: inst.id,
      email: getRelatedCustomerEmail(inst.customers),
      last_health_check: inst.last_health_check,
    }));

  return {
    totalCustomers: totalCustomers || 0,
    activeInstances: activeInstances || 0,
    mrr,
    healthPercent,
    staleInstances,
    fleetHealth,
    revenueBreakdown,
    extensibilityTelemetry,
  };
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const data = await getAdminData();

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-bold text-foreground">
        Overview
      </h2>

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

      {data.staleInstances.length > 0 && (
        <div className="bg-card rounded-xl border border-energy/30 shadow-sm p-6">
          <h3 className="font-headline text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
            Stale Health Checks ({data.staleInstances.length})
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-foreground/60">
                  Customer
                </th>
                <th className="text-left px-3 py-2 font-medium text-foreground/60">
                  Last Check
                </th>
              </tr>
            </thead>
            <tbody>
              {data.staleInstances.map((inst) => (
                <tr
                  key={inst.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 text-foreground/80">
                    {inst.email || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/60">
                    {inst.last_health_check
                      ? new Date(inst.last_health_check).toLocaleString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
