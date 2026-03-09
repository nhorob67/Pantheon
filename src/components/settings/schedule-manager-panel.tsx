"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { ScheduleActivityData } from "@/lib/queries/schedule-activity";
import { UnifiedScheduleCard } from "./unified-schedule-card";
import { ScheduleFormDialog } from "./schedule-form-dialog";

type ScheduleType = "predefined" | "custom" | "briefing";

interface AgentOption {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface ScheduleManagerPanelProps {
  tenantId: string;
  schedules: ScheduleActivityData[];
  agents: AgentOption[];
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "custom", label: "Custom" },
  { key: "predefined", label: "Predefined" },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["key"];

function healthSummary(schedules: ScheduleActivityData[]) {
  const enabled = schedules.filter((s) => s.enabled);
  const healthy = enabled.filter((s) => s.healthStatus === "healthy").length;
  const degraded = enabled.filter((s) => s.healthStatus === "degraded").length;
  const failing = enabled.filter((s) => s.healthStatus === "failing").length;

  if (enabled.length === 0) return null;

  if (failing > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-400 px-3 py-1 text-xs font-medium">
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
  if (healthy > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/20 text-[#5a8a3c] px-3 py-1 text-xs font-medium">
        {healthy} healthy
      </span>
    );
  }
  return null;
}

export function ScheduleManagerPanel({
  tenantId,
  schedules,
  agents,
}: ScheduleManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filtered = schedules.filter((s) => {
    const type = (s.schedule_type ?? "predefined") as ScheduleType;
    if (activeTab === "all") return true;
    if (activeTab === "custom") return type === "custom";
    if (activeTab === "predefined") return type === "predefined" || type === "briefing";
    return true;
  });

  const customCount = schedules.filter(
    (s) => (s.schedule_type ?? "predefined") === "custom"
  ).length;
  const activeCount = schedules.filter((s) => s.enabled).length;
  const summary = healthSummary(schedules);

  return (
    <div className="space-y-4">
      {/* Summary + Health + Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground/60">
            {activeCount} active &middot; {schedules.length} total
          </span>
          {summary}
          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Create Schedule
        </button>
      </div>

      {/* Schedule list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-foreground/50 text-sm">
          {activeTab === "custom"
            ? "No custom schedules yet. Create one or ask your agent in Discord."
            : "No schedules found. Enable predefined schedules on your agents or create custom ones."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((schedule) => (
            <UnifiedScheduleCard
              key={schedule.id}
              schedule={schedule}
              tenantId={tenantId}
              agents={agents}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreateDialog && (
        <ScheduleFormDialog
          tenantId={tenantId}
          agents={agents}
          customCount={customCount}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
