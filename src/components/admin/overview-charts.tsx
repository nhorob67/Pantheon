import { TenantHealthChartLazy as TenantHealthChart } from "./tenant-health-chart-lazy";
import { SubscriptionBreakdownLazy as SubscriptionBreakdown } from "./subscription-breakdown-lazy";
import type { TenantHealthData, RevenueData } from "@/lib/queries/admin-analytics";

interface AdminOverviewChartsProps {
  tenantHealth: TenantHealthData;
  revenue: RevenueData;
}

export function AdminOverviewCharts({
  tenantHealth,
  revenue,
}: AdminOverviewChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SubscriptionBreakdown data={revenue.breakdown} />
      <TenantHealthChart data={tenantHealth} />
    </div>
  );
}
