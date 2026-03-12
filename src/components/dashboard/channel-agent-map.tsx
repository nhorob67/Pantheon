import type { Agent } from "@/types/agent";
import { Hash, ArrowRight } from "lucide-react";

interface ChannelAgentMapProps {
  agents: Agent[];
}

export function ChannelAgentMap({ agents }: ChannelAgentMapProps) {
  const assignedAgents = agents.filter((a) => a.discord_channel_id);
  const defaultAgent = agents.find((a) => a.is_default);

  if (assignedAgents.length === 0 && !defaultAgent) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-semibold uppercase tracking-wider text-text-dim mb-3">
        Channel Routing
      </h3>

      {assignedAgents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center gap-3 bg-border rounded-lg p-3"
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-mono text-discord min-w-0">
            <Hash className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {agent.discord_channel_name || agent.discord_channel_id}
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-text-dim shrink-0" />
          <span className="text-sm text-text-primary font-medium truncate">
            {agent.display_name}
          </span>
        </div>
      ))}

      {defaultAgent && (
        <div className="flex items-center gap-3 bg-border rounded-lg p-3">
          <span className="text-sm text-text-dim">All other channels & DMs</span>
          <ArrowRight className="w-4 h-4 text-text-dim shrink-0" />
          <span className="text-sm text-text-primary font-medium truncate">
            {defaultAgent.display_name}
          </span>
        </div>
      )}
    </div>
  );
}
