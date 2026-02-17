"use client";

import dynamic from "next/dynamic";

const MessageActivityChart = dynamic(
  () =>
    import("@/components/dashboard/message-activity-chart").then(
      (m) => m.MessageActivityChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 h-64 animate-pulse" />
    ),
  }
);

export { MessageActivityChart as MessageActivityChartLazy };
