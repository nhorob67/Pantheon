"use client";

import dynamic from "next/dynamic";

const UsageChart = dynamic(
  () =>
    import("@/components/usage/usage-chart").then((m) => m.UsageChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 h-64 animate-pulse" />
    ),
  }
);

export { UsageChart as UsageChartLazy };
