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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CRON_JOB_INFO, type AvailableCronJob } from "@/types/agent";
import { ScheduleFormDialog } from "./schedule-form-dialog";

type ScheduleType = "predefined" | "custom" | "briefing";

interface Schedule {
  id: string;
  schedule_key: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  agent_id: string;
  channel_id: string;
  schedule_type: ScheduleType;
  display_name: string | null;
  prompt: string | null;
  tools: string[];
  created_by: string;
  agent_name: string | null;
  created_at: string;
}

interface AgentOption {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface UnifiedScheduleCardProps {
  schedule: Schedule;
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
  evening_ticket_summary: ClipboardList,
};

const TOOL_LABELS: Record<string, string> = {
  "farm-weather": "Weather",
  "farm-grain-bids": "Grain Bids",
  "farm-scale-tickets": "Scale Tickets",
};

function describeCronClient(expression: string): string {
  // Lightweight client-side description — will match cronstrue output from server
  // We do a basic parse for common patterns
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
    const interval = min.slice(2);
    return `Every ${interval} minutes`;
  }

  if (hour?.startsWith("*/")) {
    const interval = hour.slice(2);
    return `Every ${interval} hours`;
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

  // Multi-hour pattern like "0 9,14 * * 1-5"
  if (hour?.includes(",") && min && dow) {
    const times = hour.split(",").map((h) => formatTime(h, min)).join(" & ");
    return `${dow === "1-5" ? "Weekdays" : dow === "*" ? "Daily" : dow} at ${times}`;
  }

  return expression;
}

function getScheduleLabel(schedule: Schedule): string {
  if (schedule.display_name) return schedule.display_name;
  // Predefined: look up from CRON_JOB_INFO using hyphenated key
  const hyphenKey = schedule.schedule_key.replace(/_/g, "-");
  const info = CRON_JOB_INFO[hyphenKey as AvailableCronJob];
  if (info) return info.label;
  if (schedule.schedule_key === "morning_briefing") return "Morning Briefing";
  return schedule.schedule_key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
        className={`bg-card rounded-xl border border-border shadow-sm p-4 transition-opacity ${
          !schedule.enabled ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`rounded-lg p-2 shrink-0 ${
                isCustom ? "bg-amber-500/10" : "bg-primary/10"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isCustom ? "text-amber-500" : "text-primary"
                }`}
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
