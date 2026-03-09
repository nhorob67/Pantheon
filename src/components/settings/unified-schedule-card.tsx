"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CalendarPlus,
  CloudSun,
  TrendingUp,
  ClipboardList,
  Sun,
  AlertTriangle,
  MessageCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  Bell,
  BellOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CRON_JOB_INFO, type AvailableCronJob } from "@/types/agent";
import type { ScheduleActivityData, RecentRun } from "@/lib/queries/schedule-activity";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import { HeartbeatStrip } from "./heartbeat-strip";
import { StatusBadge } from "@/components/ui/status-badge";

interface AgentOption {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface UnifiedScheduleCardProps {
  schedule: ScheduleActivityData;
  tenantId: string;
  agents: AgentOption[];
}

const PREDEFINED_ICONS: Record<string, typeof Clock> = {
  morning_weather: CloudSun,
  daily_grain_bids: TrendingUp,
  morning_briefing: Sun,
  ticket_anomaly_check: ClipboardList,
  weather_alert_check: AlertTriangle,
  price_alert_check: TrendingUp,
};

const TOOL_LABELS: Record<string, string> = {
  "farm-weather": "Weather",
  "farm-grain-bids": "Grain Bids",
  "farm-scale-tickets": "Scale Tickets",
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-[#5a8a3c]",
  degraded: "bg-[#D98C2E]",
  failing: "bg-red-500",
  inactive: "bg-foreground/20",
};

function describeCronClient(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;

  const [min, hour, , , dow] = parts;

  const days: Record<string, string> = {
    "0": "Sunday", "1": "Monday", "2": "Tuesday", "3": "Wednesday",
    "4": "Thursday", "5": "Friday", "6": "Saturday",
  };

  const formatTime = (h: string, m: string) => {
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    const ampm = hNum >= 12 ? "PM" : "AM";
    const h12 = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;
    return `${h12}:${String(mNum).padStart(2, "0")} ${ampm}`;
  };

  if (min?.startsWith("*/")) {
    return `Every ${min.slice(2)} minutes`;
  }
  if (hour?.startsWith("*/")) {
    return `Every ${hour.slice(2)} hours`;
  }
  if (dow === "*" && hour && min) {
    return `Daily at ${formatTime(hour, min)}`;
  }
  if (dow === "1-5" && hour && min) {
    return `Weekdays at ${formatTime(hour, min)}`;
  }
  if (dow && hour && min && days[dow]) {
    return `Every ${days[dow]} at ${formatTime(hour, min)}`;
  }
  if (dow && hour && min && dow.includes(",")) {
    const dayNames = dow.split(",").map((d) => days[d] || d).join(", ");
    return `${dayNames} at ${formatTime(hour, min)}`;
  }
  if (hour?.includes(",") && min && dow) {
    const times = hour.split(",").map((h) => formatTime(h, min)).join(" & ");
    return `${dow === "1-5" ? "Weekdays" : dow === "*" ? "Daily" : dow} at ${times}`;
  }
  return expression;
}

function getScheduleLabel(schedule: ScheduleActivityData): string {
  if (schedule.display_name) return schedule.display_name;
  const hyphenKey = schedule.schedule_key.replace(/_/g, "-");
  const info = CRON_JOB_INFO[hyphenKey as AvailableCronJob];
  if (info) return info.label;
  if (schedule.schedule_key === "morning_briefing") return "Morning Briefing";
  return schedule.schedule_key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(run: RecentRun): string {
  if (!run.started_at || !run.completed_at) return "—";
  const ms =
    new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LastRunIndicator({ schedule }: { schedule: ScheduleActivityData }) {
  if (!schedule.last_run_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/40">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/20 shrink-0" />
        Never run
      </span>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true });

  if (schedule.lastRunStatus === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Failed {timeAgo}
      </span>
    );
  }

  if (schedule.lastRunStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#5a8a3c]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#5a8a3c] shrink-0" />
        Ran {timeAgo}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
      {timeAgo}
    </span>
  );
}

export function UnifiedScheduleCard({
  schedule,
  tenantId,
  agents,
}: UnifiedScheduleCardProps) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [expandedRunOutput, setExpandedRunOutput] = useState<string | null>(null);
  const [togglingNotify, setTogglingNotify] = useState(false);

  const isCustom = schedule.schedule_type === "custom";
  const Icon = isCustom
    ? CalendarPlus
    : PREDEFINED_ICONS[schedule.schedule_key] || Clock;

  const label = getScheduleLabel(schedule);
  const humanSchedule = describeCronClient(schedule.cron_expression);

  const nextRunLabel =
    schedule.enabled && schedule.next_run_at
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
      if (res.ok) router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleToggleNotify() {
    setTogglingNotify(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/schedules/${schedule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notify_on_failure: !schedule.notify_on_failure }),
        }
      );
      if (res.ok) router.refresh();
    } finally {
      setTogglingNotify(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this schedule? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/schedules/${schedule.id}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className={`bg-card rounded-xl border border-border shadow-sm p-4 space-y-3 transition-opacity ${
          !schedule.enabled ? "opacity-60" : ""
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`rounded-lg p-2 shrink-0 relative ${
                isCustom ? "bg-amber-500/10" : "bg-primary/10"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isCustom ? "text-amber-500" : "text-primary"
                }`}
              />
              {/* Health dot overlay */}
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${HEALTH_COLORS[schedule.healthStatus]}`}
                title={schedule.healthStatus}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-headline text-sm font-semibold text-foreground truncate">
                  {label}
                </h4>
                {schedule.created_by === "discord_chat" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-400">
                    <MessageCircle className="w-2.5 h-2.5" />
                    Discord
                  </span>
                )}
                {isCustom && schedule.created_by === "dashboard" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground/50">
                    Dashboard
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground/60 mt-0.5">
                {humanSchedule}
                {schedule.agent_name && <> &middot; {schedule.agent_name}</>}
                {nextRunLabel && (
                  <> &middot; Next: {nextRunLabel}</>
                )}
              </p>

              {/* Inline last run status */}
              <div className="mt-1.5">
                <LastRunIndicator schedule={schedule} />
              </div>

              {/* Tool badges */}
              {schedule.tools.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {schedule.tools.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground/60"
                    >
                      {TOOL_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              )}

              {/* Prompt preview for custom */}
              {isCustom && schedule.prompt && (
                <button
                  onClick={() => setPromptExpanded(!promptExpanded)}
                  className="flex items-center gap-1 mt-2 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  {promptExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Prompt
                </button>
              )}
              {isCustom && schedule.prompt && promptExpanded && (
                <p className="mt-1 text-xs text-foreground/50 bg-background rounded p-2 whitespace-pre-wrap">
                  {schedule.prompt}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleNotify}
              disabled={togglingNotify}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                schedule.notify_on_failure
                  ? "text-primary hover:text-primary/70 hover:bg-primary/10"
                  : "text-foreground/30 hover:text-foreground/50 hover:bg-muted"
              }`}
              title={schedule.notify_on_failure ? "Failure alerts: ON" : "Failure alerts: OFF"}
            >
              {schedule.notify_on_failure ? (
                <Bell className="w-3.5 h-3.5" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
            </button>
            {isCustom && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
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
        </div>

        {/* Expandable Activity section */}
        <button
          onClick={() => setActivityExpanded(!activityExpanded)}
          className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/60 transition-colors w-full"
        >
          {activityExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>Activity</span>
          {schedule.recentRuns.length > 0 && (
            <span className="text-foreground/30">
              ({schedule.recentRuns.length} recent runs)
            </span>
          )}
        </button>

        {activityExpanded && (
          <div className="space-y-3 pt-1">
            {/* 14-day heatmap */}
            <HeartbeatStrip buckets={schedule.dayBuckets} disabled={!schedule.enabled} />

            {/* Recent runs */}
            {schedule.recentRuns.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-foreground/40 font-medium uppercase tracking-wide">
                  Recent Runs
                </p>
                {schedule.recentRuns.map((run) => (
                  <div key={run.id} className="space-y-1">
                    <div className="flex items-center gap-3 text-xs px-2 py-1.5 rounded-lg bg-background">
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
                      {run.retry_attempt != null && run.retry_attempt > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[#D98C2E]" title={`Retry attempt ${run.retry_attempt}`}>
                          <RefreshCw className="w-2.5 h-2.5" />
                          {run.retry_attempt}
                        </span>
                      )}
                      {run.error_message && (
                        <span className="text-red-400 truncate ml-auto max-w-[200px]" title={run.error_message}>
                          {run.error_message}
                        </span>
                      )}
                      {run.response_preview && (
                        <button
                          onClick={() =>
                            setExpandedRunOutput(
                              expandedRunOutput === run.id ? null : run.id
                            )
                          }
                          className="ml-auto p-1 rounded text-foreground/30 hover:text-foreground/60 transition-colors"
                          title="View output"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Output preview */}
                    {expandedRunOutput === run.id && run.response_preview && (
                      <div className="ml-2 px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground/60 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {run.response_preview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {schedule.recentRuns.length === 0 && (
              <p className="text-xs text-foreground/30 text-center py-2">
                No runs in the last 14 days
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {showEdit && (
        <ScheduleFormDialog
          tenantId={tenantId}
          agents={agents}
          editSchedule={{
            id: schedule.id,
            display_name: schedule.display_name || "",
            prompt: schedule.prompt || "",
            cron_expression: schedule.cron_expression,
            timezone: schedule.timezone,
            tools: schedule.tools,
            enabled: schedule.enabled,
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
