"use client";

import dynamic from "next/dynamic";

const AgentCostAttribution = dynamic(
  () =>
    import("@/components/usage/agent-cost-attribution").then(
      (m) => m.AgentCostAttribution
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 h-64 animate-pulse" />
    ),
  }
);

export { AgentCostAttribution as AgentCostAttributionLazy };
