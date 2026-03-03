"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CloudSun,
  TrendingUp,
  ClipboardList,
  Sun,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CRON_JOB_INFO, type AvailableCronJob } from "@/types/agent";
import type { ScheduleActivityData, RecentRun } from "@/lib/queries/schedule-activity";
import { HeartbeatStrip } from "./heartbeat-strip";

const SCHEDULE_ICONS: Record<string, LucideIcon> = {
  "morning-weather": CloudSun,
  "daily-grain-bids": TrendingUp,
  "morning_briefing": Sun,
  "ticket-anomaly-check": ClipboardList,
  "weather-alert-check": AlertTriangle,
  "price-alert-check": TrendingUp,
};

function getScheduleLabel(key: string): string {
  const cronInfo = CRON_JOB_INFO[key as AvailableCronJob];
  if (cronInfo) return cronInfo.label;
  if (key === "morning_briefing") return "Morning Briefing";
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScheduleDescription(key: string, cron: string): string {
  const cronInfo = CRON_JOB_INFO[key as AvailableCronJob];
  if (cronInfo) return cronInfo.description;
  if (key === "morning_briefing") return "Daily briefing delivered to Discord";
  return `Cron: ${cron}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/20 text-[#5a8a3c] px-2 py-0.5 text-xs font-medium">
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-400 px-2 py-0.5 text-xs font-medium">
          Failed
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/20 text-blue-400 px-2 py-0.5 text-xs font-medium">
          Running
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-muted text-foreground/60 px-2 py-0.5 text-xs font-medium">
          {status}
        </span>
      );
  }
}

function formatDuration(run: RecentRun): string {
  if (!run.started_at || !run.completed_at) return "—";
  const ms =
    new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface ScheduleCardProps {
  schedule: ScheduleActivityData;
  tenantId: string;
}

export function ScheduleCard({ schedule, tenantId }: ScheduleCardProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [open, setOpen] = useState(false);

  const Icon = SCHEDULE_ICONS[schedule.schedule_key] || Clock;
  const label = getScheduleLabel(schedule.schedule_key);
  const description = getScheduleDescription(
    schedule.schedule_key,
    schedule.cron_expression
  );

  const nextRunLabel = schedule.enabled && schedule.next_run_at
    ? formatDistanceToNow(new Date(schedule.next_run_at), { addSuffix: true })
    : null;

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/schedules/${schedule.id}/toggle`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !schedule.enabled }),
        }
      );
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className={`bg-card rounded-xl border border-border shadow-sm p-5 space-y-4 transition-opacity ${
        !schedule.enabled ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-headline text-sm font-semibold text-foreground truncate">
                {label}
              </h4>
              {nextRunLabel && (
                <span className="text-xs text-foreground/50">
                  Next: {nextRunLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground/60 mt-0.5">
              {description}
              {schedule.agent_name && (
                <> &middot; {schedule.agent_name}</>
              )}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={schedule.enabled}
          disabled={toggling}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${
            schedule.enabled ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              schedule.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Heartbeat strip */}
      <HeartbeatStrip buckets={schedule.dayBuckets} disabled={!schedule.enabled} />

      {/* Expandable recent runs */}
      {schedule.recentRuns.length > 0 && (
        <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="text-xs text-foreground/50 cursor-pointer hover:text-foreground/70 transition-colors select-none">
            Recent runs ({schedule.recentRuns.length})
          </summary>
          <div className="mt-3 space-y-2">
            {schedule.recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 text-xs px-2 py-1.5 rounded-lg bg-background"
              >
                {statusBadge(run.status)}
                <span className="text-foreground/60">
                  {new Date(run.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-foreground/40">{formatDuration(run)}</span>
                {run.error_message && (
                  <span className="text-red-400 truncate ml-auto max-w-[200px]" title={run.error_message}>
                    {run.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
