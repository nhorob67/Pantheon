"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/components/charts/chart-styles";

interface HealthData {
  running: number;
  stopped: number;
  errored: number;
}

/* Recharts SVG requires raw hex — these match the CSS variable values */
const COLORS = ["#5a8a3c", "#D98C2E", "#b24c3f"];

const legendFormatter = (value: string) => (
  <span className="text-xs text-foreground/60">{value}</span>
);

export function FleetHealthChart({ data }: { data: HealthData }) {
  const chartData = [
    { name: "Running", value: data.running },
    { name: "Stopped", value: data.stopped },
    { name: "Error", value: data.errored },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
          Fleet Health
        </h3>
        <p className="text-foreground/60 text-sm">No instances</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
        Fleet Health
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend formatter={legendFormatter} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
