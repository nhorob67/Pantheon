"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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

export function ScheduleManagerPanel({
  tenantId,
  schedules,
  agents,
}: ScheduleManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { filtered, customCount, activeCount, summary } = useMemo(() => {
    let _customCount = 0;
    let _activeCount = 0;
    let _healthy = 0;
    let _degraded = 0;
    let _failing = 0;
    const _filtered: ScheduleActivityData[] = [];

    for (const s of schedules) {
      const type = (s.schedule_type ?? "predefined") as ScheduleType;
      if (type === "custom") _customCount++;
      if (s.enabled) {
        _activeCount++;
        if (s.healthStatus === "healthy") _healthy++;
        else if (s.healthStatus === "degraded") _degraded++;
        else if (s.healthStatus === "failing") _failing++;
      }
      if (
        activeTab === "all" ||
        (activeTab === "custom" && type === "custom") ||
        (activeTab === "predefined" && (type === "predefined" || type === "briefing"))
      ) {
        _filtered.push(s);
      }
    }

    let _summary: React.ReactNode = null;
    if (_activeCount > 0) {
      if (_failing > 0) {
        _summary = (
          <span className="inline-flex items-center rounded-full bg-destructive/20 text-destructive px-3 py-1 text-xs font-medium">
            {_failing} failing
          </span>
        );
      } else if (_degraded > 0) {
        _summary = (
          <span className="inline-flex items-center rounded-full bg-[#D98C2E]/20 text-[#D98C2E] px-3 py-1 text-xs font-medium">
            {_degraded} degraded &middot; {_healthy} healthy
          </span>
        );
      } else if (_healthy > 0) {
        _summary = (
          <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/20 text-[#5a8a3c] px-3 py-1 text-xs font-medium">
            {_healthy} healthy
          </span>
        );
      }
    }

    return {
      filtered: _filtered,
      customCount: _customCount,
      activeCount: _activeCount,
      summary: _summary,
    };
  }, [schedules, activeTab]);

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
        schedules.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No schedules configured"
            description="Set up recurring tasks and check-ins for your agents. Schedules run automatically on your chosen cadence."
            actions={[{ label: "Create Schedule", variant: "primary", icon: CalendarPlus, onClick: () => setShowCreateDialog(true) }]}
          />
        ) : (
          <EmptyState
            icon={CalendarClock}
            kind="filtered"
            size="compact"
            title="No schedules match this filter"
            description="Try switching tabs or create a new schedule."
          />
        )
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
