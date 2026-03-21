"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { Agent } from "@/types/agent";
import { useSelectedAgentId, useWorkspace } from "@/hooks/use-workspace";
import { AgentPanelItem } from "./agent-panel-item";

interface AgentPanelProps {
  agents: Agent[];
}

export function AgentPanel({ agents }: AgentPanelProps) {
  const [search, setSearch] = useState("");
  const selectedAgentId = useSelectedAgentId();
  const selectAgent = useWorkspace((s) => s.selectAgent);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.display_name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [agents, search]);

  return (
    <div className="w-[280px] shrink-0 bg-bg-dark border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
          Agents
        </h2>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find agent..."
            className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-text-primary placeholder:text-text-dim focus:border-accent/40 focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 relative">
        {/* Top fade */}
        <div className="sticky top-0 h-2 bg-gradient-to-b from-bg-dark to-transparent pointer-events-none z-10" />

        {filtered.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-6">
            {search ? "No agents match your search" : "No agents yet"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((agent) => (
              <AgentPanelItem
                key={agent.id}
                agent={agent}
                selected={agent.id === selectedAgentId}
                onSelect={() => selectAgent(agent.id)}
              />
            ))}
          </div>
        )}

        {/* Bottom fade */}
        <div className="sticky bottom-0 h-2 bg-gradient-to-t from-bg-dark to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}
