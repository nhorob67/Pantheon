"use client";

import dynamic from "next/dynamic";

const TenantHealthChart = dynamic(
  () => import("./tenant-health-chart").then((m) => m.TenantHealthChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-[268px] animate-pulse" />
    ),
  }
);

export { TenantHealthChart as TenantHealthChartLazy };
