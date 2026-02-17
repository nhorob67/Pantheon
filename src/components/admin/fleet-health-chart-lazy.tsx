"use client";

import dynamic from "next/dynamic";

const FleetHealthChart = dynamic(
  () => import("./fleet-health-chart").then((m) => m.FleetHealthChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-[268px] animate-pulse" />
    ),
  }
);

export { FleetHealthChart as FleetHealthChartLazy };
