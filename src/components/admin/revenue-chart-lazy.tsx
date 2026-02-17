"use client";

import dynamic from "next/dynamic";

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-[332px] animate-pulse" />
    ),
  }
);

export { RevenueChart as RevenueChartLazy };
