"use client";

import type { Agent } from "@/types/agent";
import { PRESET_INFO, SKILL_INFO, CRON_JOB_INFO } from "@/types/agent";
import type { BuiltInSkill, AvailableCronJob } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Clock, Hash } from "lucide-react";

const presetAccentBorder: Record<string, string> = {
  general: "border-l-green-bright",
  grain: "border-l-amber-500",
  weather: "border-l-blue-400",
  "scale-tickets": "border-l-orange-500",
  operations: "border-l-emerald-500",
  agronomy: "border-l-lime-500",
  equipment: "border-l-zinc-400",
  custom: "border-l-text-dim",
};

const presetBadgeVariant: Record<string, "success" | "warning" | "info" | "neutral"> = {
  general: "success",
  grain: "warning",
  weather: "info",
  "scale-tickets": "warning",
  operations: "success",
  agronomy: "success",
  equipment: "neutral",
  custom: "neutral",
};

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const presetInfo = PRESET_INFO[agent.personality_preset];
  const borderColor = presetAccentBorder[agent.personality_preset] || "border-l-text-dim";
  const badgeVariant = presetBadgeVariant[agent.personality_preset] || "neutral";

  const activeCrons = Object.entries(agent.cron_jobs || {}).filter(
    ([, enabled]) => enabled
  );

  return (
    <div
      className={`bg-bg-card rounded-xl border border-border border-l-[3px] ${borderColor} shadow-sm p-5 transition-colors hover:bg-bg-card-hover`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h4 className="font-headline text-base font-semibold text-text-primary truncate">
            {agent.display_name}
          </h4>
          <Badge variant={badgeVariant}>{presetInfo.label}</Badge>
          {agent.is_default && (
            <Badge variant="success">DEFAULT</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => onEdit(agent)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer"
            aria-label={`Edit ${agent.display_name}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(agent)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
            aria-label={`Delete ${agent.display_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Channel */}
      <div className="mb-3">
        {agent.discord_channel_id ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-mono bg-[#5865F2]/10 text-[#5865F2] px-2.5 py-1 rounded-md">
            <Hash className="w-3.5 h-3.5" />
            {agent.discord_channel_name || agent.discord_channel_id}
          </span>
        ) : (
          <span className="text-sm text-text-dim">
            {agent.is_default ? "All other channels & DMs" : "No channel assigned"}
          </span>
        )}
      </div>

      {/* Footer: Skills + Crons */}
      <div className="flex flex-wrap items-center gap-2">
        {agent.skills.map((skill) => {
          const info = SKILL_INFO[skill as BuiltInSkill];
          return (
            <span
              key={skill}
              className="inline-flex items-center text-xs font-medium bg-white/5 text-text-secondary px-2 py-1 rounded-md"
            >
              {info?.label || skill}
            </span>
          );
        })}

        {activeCrons.map(([cronName]) => {
          const info = CRON_JOB_INFO[cronName as AvailableCronJob];
          return (
            <span
              key={cronName}
              className="inline-flex items-center gap-1 text-xs text-text-dim"
            >
              <Clock className="w-3 h-3" />
              {info?.label || cronName}
            </span>
          );
        })}
      </div>
    </div>
  );
}
