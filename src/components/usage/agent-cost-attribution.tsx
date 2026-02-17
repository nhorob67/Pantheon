"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCents } from "@/lib/utils/format";

interface AgentCostData {
  agent_key: string;
  display_name: string;
  messages: number;
  cost_cents: number;
}

interface AgentCostAttributionProps {
  data: AgentCostData[];
}

const COLORS = [
  "#5a8a3c", // primary green
  "#D98C2E", // amber energy
  "#4f8bc5", // blue intelligence
  "#e57a3a", // orange
  "#8b6cc4", // purple
];

export function AgentCostAttribution({ data }: AgentCostAttributionProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
        Cost by Agent
      </h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => formatCents(v)}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="display_name"
              width={100}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => formatCents(Number(value ?? 0))}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="cost_cents" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
