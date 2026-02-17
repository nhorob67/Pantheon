"use client";

import { useState } from "react";
import { SUGGESTED_SETUPS } from "@/lib/templates/agent-presets";
import { PRESET_INFO } from "@/types/agent";
import type { PersonalityPreset } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

interface AgentPresetsPickerProps {
  instanceId: string;
  onDeployed: () => void;
}

export function AgentPresetsPicker({
  instanceId,
  onDeployed,
}: AgentPresetsPickerProps) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async (setupId: string) => {
    const setup = SUGGESTED_SETUPS.find((s) => s.id === setupId);
    if (!setup) return;

    setDeploying(setupId);
    setError(null);

    try {
      // Create all agents sequentially (order matters for default agent)
      for (const agentConfig of setup.agents) {
        const res = await fetch(`/api/instances/${instanceId}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(agentConfig),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create agent");
        }
      }

      onDeployed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setDeploying(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-energy" />
        <h4 className="text-sm font-semibold text-text-primary">
          Suggested Setups
        </h4>
      </div>

      <div className="grid gap-3">
        {SUGGESTED_SETUPS.map((setup) => (
          <div
            key={setup.id}
            className="rounded-xl border border-border bg-bg-card p-4 hover:bg-bg-card-hover transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {setup.label}
                </p>
                <p className="text-xs text-text-dim mb-3">
                  {setup.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {setup.agents.map((agent) => {
                    const info = PRESET_INFO[agent.personality_preset as PersonalityPreset];
                    return (
                      <Badge key={agent.display_name} variant="neutral">
                        {info?.label || agent.display_name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeploy(setup.id)}
                disabled={deploying !== null}
                className="shrink-0 bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {deploying === setup.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Deploy
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
