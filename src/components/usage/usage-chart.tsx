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
import type { UsageByDay } from "@/types/billing";

interface UsageChartProps {
  data: UsageByDay[];
}

export function UsageChart({ data }: UsageChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    cost: d.total_cost_cents / 100,
  }));

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
        Daily API Usage
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5a7394" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#5a7394" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4c4a8" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#3d352a", opacity: 0.5 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#3d352a", opacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d4c4a8",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#5a7394"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTokens)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
