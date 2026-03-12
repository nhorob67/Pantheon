"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BreakdownData {
  active: number;
  past_due: number;
  canceled: number;
  incomplete: number;
}

export function SubscriptionBreakdown({ data }: { data: BreakdownData }) {
  const chartData = [
    { name: "Active", count: data.active, fill: "#4a7c59" },
    { name: "Past Due", count: data.past_due, fill: "#c4842d" },
    { name: "Canceled", count: data.canceled, fill: "#b24c3f" },
    { name: "Incomplete", count: data.incomplete, fill: "#5a7394" },
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em] mb-4">
        Subscription Breakdown
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d4c4a8"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#3d352a", opacity: 0.5 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#3d352a", opacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d4c4a8",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
