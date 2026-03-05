"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { UnifiedScheduleCard } from "./unified-schedule-card";
import { ScheduleFormDialog } from "./schedule-form-dialog";

type ScheduleType = "predefined" | "custom" | "briefing";

interface ScheduleRow {
  id: string;
  schedule_key: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  agent_id: string;
  channel_id: string;
  metadata: Record<string, unknown>;
  schedule_type: string | null;
  display_name: string | null;
  prompt: string | null;
  tools: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tenant_agents:
    | { id: string; display_name: string }
    | { id: string; display_name: string }[]
    | null;
}

interface AgentOption {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface ScheduleManagerPanelProps {
  tenantId: string;
  schedules: ScheduleRow[];
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

  return (
    <div className="space-y-4">
      {/* Summary + Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground/60">
            {activeCount} active &middot; {schedules.length} total
          </span>
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
          {filtered.map((schedule) => {
            const agentJoin = schedule.tenant_agents;
            const agentName = agentJoin
              ? Array.isArray(agentJoin)
                ? agentJoin[0]?.display_name ?? null
                : agentJoin.display_name
              : null;

            return (
              <UnifiedScheduleCard
                key={schedule.id}
                schedule={{
                  ...schedule,
                  schedule_type: (schedule.schedule_type ?? "predefined") as ScheduleType,
                  display_name: schedule.display_name,
                  prompt: schedule.prompt,
                  tools: schedule.tools ?? [],
                  created_by: schedule.created_by ?? "system",
                  agent_name: agentName,
                }}
                tenantId={tenantId}
                agents={agents}
              />
            );
          })}
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
