"use client";

import type { Agent, AutonomyLevel } from "@/types/agent";
import { AUTONOMY_LEVEL_INFO } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Hash, FlaskConical, Copy, ShieldCheck, Sparkles, Zap } from "lucide-react";

const autonomyDots: Record<AutonomyLevel, string> = {
  assisted: "text-blue-400",
  copilot: "text-amber-400",
  autopilot: "text-green-400",
};

const autonomyIcons: Record<AutonomyLevel, React.ElementType> = {
  assisted: ShieldCheck,
  copilot: Sparkles,
  autopilot: Zap,
};

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onDuplicate?: (agent: Agent) => void;
  onPreview?: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete, onDuplicate, onPreview }: AgentCardProps) {
  const autonomy = agent.autonomy_level || "copilot";
  const autonomyInfo = AUTONOMY_LEVEL_INFO[autonomy];
  const AutonomyIcon = autonomyIcons[autonomy];
  const dotColor = autonomyDots[autonomy];

  const skillCount = (agent.skills || []).length;

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 transition-colors hover:bg-bg-card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h4 className="font-headline text-base font-semibold text-text-primary truncate">
            {agent.display_name}
          </h4>
          {agent.is_default && (
            <Badge variant="success">DEFAULT</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(agent)}
              className="group/tip relative inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
              aria-label={`Test ${agent.display_name}`}
            >
              <FlaskConical className="w-4 h-4" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-bg-elevated px-2 py-1 text-xs text-text-secondary opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Test</span>
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(agent)}
              className="group/tip relative inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-border hover:text-text-primary transition-colors cursor-pointer"
              aria-label={`Duplicate ${agent.display_name}`}
            >
              <Copy className="w-4 h-4" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-bg-elevated px-2 py-1 text-xs text-text-secondary opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Duplicate</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(agent)}
            className="group/tip relative inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-border hover:text-text-primary transition-colors cursor-pointer"
            aria-label={`Edit ${agent.display_name}`}
          >
            <Pencil className="w-4 h-4" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-bg-elevated px-2 py-1 text-xs text-text-secondary opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(agent)}
            className="group/tip relative inline-flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            aria-label={`Delete ${agent.display_name}`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-bg-elevated px-2 py-1 text-xs text-text-secondary opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Delete</span>
          </button>
        </div>
      </div>

      {/* Role */}
      {agent.role && (
        <p className="text-sm font-medium text-text-secondary mb-1">
          {agent.role}
        </p>
      )}

      {/* Goal */}
      {agent.goal && (
        <p className="text-sm text-text-dim mb-3 line-clamp-2">
          {agent.goal}
        </p>
      )}

      {/* Channel + Autonomy */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {agent.discord_channel_id ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-mono bg-discord-dim text-discord px-2.5 py-1 rounded-md">
            <Hash className="w-3.5 h-3.5" />
            {agent.discord_channel_name || agent.discord_channel_id}
          </span>
        ) : (
          <span className="text-sm text-text-dim">
            {agent.is_default ? "All channels & DMs" : "No channel"}
          </span>
        )}

        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${dotColor}`}>
          <AutonomyIcon className="w-3.5 h-3.5" />
          {autonomyInfo.label}
        </span>
      </div>

      {/* Footer: skill count */}
      {skillCount > 0 && (
        <p className="text-xs text-text-dim">
          {skillCount} skill{skillCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
