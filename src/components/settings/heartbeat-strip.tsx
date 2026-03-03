"use client";

import type { DayBucket } from "@/lib/queries/schedule-activity";

interface HeartbeatStripProps {
  buckets: DayBucket[];
  disabled?: boolean;
}

function cellColor(bucket: DayBucket): string {
  if (bucket.total === 0) return "bg-muted";
  if (bucket.failed === 0) return "bg-[#5a8a3c]";
  if (bucket.succeeded === 0) return "bg-red-600";
  return "bg-[#D98C2E]";
}

function tooltipText(bucket: DayBucket): string {
  const date = new Date(bucket.date + "T12:00:00");
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (bucket.total === 0) return `${label}: No runs`;
  return `${label}: ${bucket.succeeded}/${bucket.total} succeeded`;
}

export function HeartbeatStrip({ buckets, disabled }: HeartbeatStripProps) {
  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  const firstLabel = first
    ? new Date(first.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="flex gap-1">
        {buckets.map((bucket) => (
          <div
            key={bucket.date}
            className={`w-5 h-5 rounded-sm ${cellColor(bucket)} transition-colors`}
            title={tooltipText(bucket)}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-foreground/40">
        <span>{firstLabel}</span>
        <span>{last ? "Today" : ""}</span>
      </div>
    </div>
  );
}
