"use client";

import type { Agent } from "@/types/agent";
import { useStreamingAgentId } from "@/hooks/use-workspace";

const AVATAR_COLORS = [
  "bg-amber-700/60",
  "bg-emerald-700/60",
  "bg-slate-600/60",
  "bg-rose-700/60",
  "bg-teal-700/60",
  "bg-orange-700/60",
  "bg-purple-700/60",
  "bg-stone-600/60",
] as const;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(agentKey: string): string {
  return AVATAR_COLORS[hashCode(agentKey) % AVATAR_COLORS.length];
}

export function AgentAvatar({
  agentKey,
  displayName,
  size = 36,
  selected = false,
}: {
  agentKey: string;
  displayName: string;
  size?: number;
  selected?: boolean;
}) {
  const streaming = useStreamingAgentId();
  const isStreaming = selected && streaming !== null;
  const color = getAvatarColor(agentKey);
  const initial = displayName.charAt(0).toUpperCase();
  const fontSize = size <= 32 ? "text-xs" : size >= 56 ? "text-xl" : "text-sm";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-headline font-bold ${color} text-text-primary ${fontSize} shrink-0 ${
        selected ? "ring-2 ring-accent/40" : ""
      } ${isStreaming ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

const AUTONOMY_DOT_COLORS: Record<string, string> = {
  autopilot: "bg-green-bright",
  copilot: "bg-accent",
  assisted: "bg-intelligence",
};

interface AgentPanelItemProps {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}

export function AgentPanelItem({ agent, selected, onSelect }: AgentPanelItemProps) {
  const dotColor = AUTONOMY_DOT_COLORS[agent.autonomy_level] || "bg-text-dim";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150 cursor-pointer ${
        selected
          ? "bg-accent/8 border-l-2 border-accent"
          : "hover:bg-bg-surface border-l-2 border-transparent"
      }`}
    >
      <AgentAvatar
        agentKey={agent.agent_key}
        displayName={agent.display_name}
        size={36}
        selected={selected}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text-primary truncate">
            {agent.display_name}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        </div>
        <p className="text-xs text-text-dim truncate">{agent.role}</p>
        {agent.discord_channel_name ? (
          <span className="text-[11px] font-mono text-discord/60">
            #{agent.discord_channel_name}
          </span>
        ) : agent.is_default ? (
          <span className="text-[11px] font-mono text-accent/60">Default</span>
        ) : null}
      </div>
    </button>
  );
}
