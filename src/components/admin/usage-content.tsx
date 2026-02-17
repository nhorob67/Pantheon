import { formatCents } from "@/lib/utils/format";
import { RevenueChartLazy as RevenueChart } from "./revenue-chart-lazy";
import type {
  DailyUsage,
  TopConsumer,
  RevenueData,
} from "@/lib/queries/admin-analytics";

interface AdminUsageContentProps {
  daily: DailyUsage[];
  topConsumers: TopConsumer[];
  revenue: RevenueData;
}

export function AdminUsageContent({
  daily,
  topConsumers,
  revenue,
}: AdminUsageContentProps) {
  return (
    <div className="space-y-6">
      {/* MRR Card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <p className="text-xs text-foreground/50 mb-1">MRR</p>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {formatCents(revenue.mrr)}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <p className="text-xs text-foreground/50 mb-1">
            Active Subscriptions
          </p>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {revenue.breakdown.active}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <p className="text-xs text-foreground/50 mb-1">Past Due</p>
          <p className="font-mono text-2xl font-semibold text-amber-700">
            {revenue.breakdown.past_due}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <p className="text-xs text-foreground/50 mb-1">Total Customers</p>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {revenue.total_customers}
          </p>
        </div>
      </div>

      {/* Usage chart */}
      <RevenueChart data={daily} />

      {/* Top consumers */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
          Top Consumers (30 days)
        </h3>
        {topConsumers.length === 0 ? (
          <p className="text-foreground/40 text-sm">No usage data</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-foreground/60">
                  Customer
                </th>
                <th className="text-right px-3 py-2 font-medium text-foreground/60">
                  API Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {topConsumers.map((c) => (
                <tr
                  key={c.customer_id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 text-foreground/80">
                    {c.email || c.customer_id}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCents(c.total_cost_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
