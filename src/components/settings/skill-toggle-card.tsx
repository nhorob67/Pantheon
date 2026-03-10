"use client";

import { useState } from "react";
import { Wheat, Cloud, ClipboardList } from "lucide-react";

const SKILL_INFO: Record<string, { label: string; description: string; icon: typeof Wheat }> = {
  "farm-grain-bids": {
    label: "Grain Bids",
    description: "Fetch daily cash grain bids from your configured elevators.",
    icon: Wheat,
  },
  "farm-weather": {
    label: "Weather Intelligence",
    description: "Morning briefings, spray windows, and forecast data from NWS.",
    icon: Cloud,
  },
  "farm-scale-tickets": {
    label: "Scale Tickets",
    description: "Log grain deliveries via photo OCR, voice entry, or structured input.",
    icon: ClipboardList,
  },
};

const EMPTY_AGENT_NAMES: string[] = [];

interface SkillToggleCardProps {
  skillName: string;
  enabled: boolean;
  tenantId: string;
  agentNames?: string[];
}

export function SkillToggleCard({
  skillName,
  enabled: initialEnabled,
  tenantId,
  agentNames = EMPTY_AGENT_NAMES,
}: SkillToggleCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [toggling, setToggling] = useState(false);

  const info = SKILL_INFO[skillName] || {
    label: skillName,
    description: "",
    icon: Wheat,
  };
  const Icon = info.icon;

  const handleToggle = async () => {
    setToggling(true);
    const newVal = !enabled;
    setEnabled(newVal);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/update-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skillName, enabled: newVal }),
      });

      if (!res.ok) {
        setEnabled(!newVal);
      }
    } catch {
      setEnabled(!newVal);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-energy/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-energy" />
        </div>
        <div>
          <p className="font-medium text-sm">{info.label}</p>
          <p className="text-xs text-foreground/50">{info.description}</p>
            {agentNames.length > 0 ? (
              <p className="text-xs text-accent mt-0.5" title={agentNames.join(", ")}>
                Used by {agentNames.length} assistant{agentNames.length !== 1 ? "s" : ""}: {agentNames.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-foreground/30 mt-0.5">Not assigned to any assistant</p>
            )}
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
