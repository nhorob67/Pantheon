"use client";

import dynamic from "next/dynamic";

const SubscriptionBreakdown = dynamic(
  () =>
    import("./subscription-breakdown").then((m) => m.SubscriptionBreakdown),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-[268px] animate-pulse" />
    ),
  }
);

export { SubscriptionBreakdown as SubscriptionBreakdownLazy };
