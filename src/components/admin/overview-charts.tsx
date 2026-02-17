import { FleetHealthChartLazy as FleetHealthChart } from "./fleet-health-chart-lazy";
import { SubscriptionBreakdownLazy as SubscriptionBreakdown } from "./subscription-breakdown-lazy";
import type { FleetHealthData, RevenueData } from "@/lib/queries/admin-analytics";

interface AdminOverviewChartsProps {
  health: FleetHealthData;
  revenue: RevenueData;
}

export function AdminOverviewCharts({
  health,
  revenue,
}: AdminOverviewChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SubscriptionBreakdown data={revenue.breakdown} />
      <FleetHealthChart data={health} />
    </div>
  );
}
