"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface HealthData {
  running: number;
  stopped: number;
  errored: number;
}

const COLORS = ["#4a7c59", "#c4842d", "#b24c3f"];

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
        <p className="text-foreground/40 text-sm">No instances</p>
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
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d4c4a8",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: "12px", color: "#3d352a" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
