"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { HeartbeatConfig } from "@/types/heartbeat";

interface Agent {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface HeartbeatAgentOverridesProps {
  tenantId: string;
  agents: Agent[];
  overrides: HeartbeatConfig[];
}

export function HeartbeatAgentOverrides({
  tenantId,
  agents,
  overrides: initialOverrides,
}: HeartbeatAgentOverridesProps) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState(initialOverrides);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const agentsWithOverrides = agents.map((agent) => ({
    ...agent,
    override: overrides.find((o) => o.agent_id === agent.id) || null,
  }));

  const handleDelete = async (agentId: string) => {
    const res = await fetch(
      `/api/tenants/${tenantId}/heartbeat/agents/${agentId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setOverrides((prev) => prev.filter((o) => o.agent_id !== agentId));
      toast("Override removed", "success");
    } else {
      toast("Failed to remove override", "error");
    }
  };

  if (agents.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base font-semibold mb-1">
        Per-Agent Overrides
      </h3>
      <p className="text-xs text-foreground/50 mb-4">
        Agents without overrides use the tenant default settings above.
      </p>

      <div className="space-y-2">
        {agentsWithOverrides.map((agent) => (
          <div
            key={agent.id}
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedAgent(
                  expandedAgent === agent.id ? null : agent.id
                )
              }
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedAgent === agent.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-foreground/40" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
                )}
                <span className="font-medium">{agent.display_name}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  agent.override
                    ? "bg-[#D98C2E]/10 text-[#D98C2E]"
                    : "bg-muted text-foreground/40"
                }`}
              >
                {agent.override ? "Custom" : "Default"}
              </span>
            </button>

            {expandedAgent === agent.id && (
              <div className="px-4 pb-4 border-t border-border">
                {agent.override ? (
                  <div className="pt-3 space-y-2">
                    <div className="text-xs text-foreground/60">
                      Interval: {agent.override.interval_minutes} min |{" "}
                      Active: {agent.override.active_hours_start}–
                      {agent.override.active_hours_end} |{" "}
                      {agent.override.enabled ? "Enabled" : "Disabled"}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(agent.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove override (use default)
                    </button>
                  </div>
                ) : (
                  <p className="pt-3 text-xs text-foreground/50">
                    Using tenant default settings. Per-agent overrides can be
                    configured via the API.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
