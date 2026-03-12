"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK, formatCostTooltip } from "@/components/charts/chart-styles";

interface DailyUsage {
  date: string;
  cost_cents: number;
  input_tokens: number;
  output_tokens: number;
}

/* Matches --green-bright CSS variable */
const CHART_GREEN = "#5a8a3c";

export function RevenueChart({ data }: { data: DailyUsage[] }) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    cost: d.cost_cents / 100,
  }));

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em] mb-4">
        Daily API Cost (All Customers)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(240, 236, 228, 0.08)"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={formatCostTooltip}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke={CHART_GREEN}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
