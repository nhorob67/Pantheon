"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import type { ScheduleActivityData } from "@/lib/queries/schedule-activity";
import { ScheduleCard } from "./schedule-card";

interface ScheduleActivityPanelProps {
  tenantId: string;
  schedules: ScheduleActivityData[];
}

function healthSummary(schedules: ScheduleActivityData[]) {
  const enabled = schedules.filter((s) => s.enabled);
  const healthy = enabled.filter((s) => s.healthStatus === "healthy").length;
  const degraded = enabled.filter((s) => s.healthStatus === "degraded").length;
  const failing = enabled.filter((s) => s.healthStatus === "failing").length;

  if (enabled.length === 0) return null;

  if (failing > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/20 text-destructive px-3 py-1 text-xs font-medium">
        {failing} failing
      </span>
    );
  }
  if (degraded > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#D98C2E]/20 text-[#D98C2E] px-3 py-1 text-xs font-medium">
        {degraded} degraded &middot; {healthy} healthy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/20 text-[#5a8a3c] px-3 py-1 text-xs font-medium">
      {healthy} healthy
    </span>
  );
}

export function ScheduleActivityPanel({
  tenantId,
  schedules,
}: ScheduleActivityPanelProps) {
  if (schedules.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
        <Calendar className="w-8 h-8 text-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-foreground/60 mb-2">
          No scheduled tasks configured yet.
        </p>
        <Link
          href="/settings/schedules"
          className="text-sm text-primary hover:underline"
        >
          Set up a schedule
        </Link>
      </div>
    );
  }

  const summary = healthSummary(schedules);

  return (
    <div className="space-y-4">
      {summary && <div>{summary}</div>}
      {schedules.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          tenantId={tenantId}
        />
      ))}
    </div>
  );
}
