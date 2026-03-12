"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Sun,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ScheduleActivityData, RecentRun } from "@/lib/queries/schedule-activity";
import { HeartbeatStrip } from "./heartbeat-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";

const SCHEDULE_ICONS: Record<string, LucideIcon> = {
  "morning_briefing": Sun,
  "daily-summary": Sun,
  "weekly-report": ClipboardList,
  "morning-standup": Clock,
};

function getScheduleLabel(key: string): string {
  if (key === "morning_briefing") return "Morning Briefing";
  return key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScheduleDescription(key: string, cron: string): string {
  if (key === "morning_briefing") return "Daily briefing delivered to Discord";
  return `Cron: ${cron}`;
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
        <Switch
          checked={schedule.enabled}
          onChange={() => handleToggle()}
          disabled={toggling}
        />
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
                <StatusBadge status={run.status} />
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
                  <span className="text-destructive truncate ml-auto max-w-[200px]" title={run.error_message}>
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
