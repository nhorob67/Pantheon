"use client";

import { useState, useCallback, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import type { Agent, AutonomyLevel } from "@/types/agent";
import { AUTONOMY_OPTIONS } from "@/types/agent";
import { useToast } from "@/components/ui/toast";

interface InspectorIdentitySectionProps {
  agent: Agent;
  tenantId: string;
  onAgentUpdated: () => void;
}

export function InspectorIdentitySection({
  agent,
  tenantId,
  onAgentUpdated,
}: InspectorIdentitySectionProps) {
  const [displayName, setDisplayName] = useState(agent.display_name);
  const [role, setRole] = useState(agent.role);
  const [goal, setGoal] = useState(agent.goal || "");
  const [backstory, setBackstory] = useState(agent.backstory || "");
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(agent.autonomy_level);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDisplayName(agent.display_name);
    setRole(agent.role);
    setGoal(agent.goal || "");
    setBackstory(agent.backstory || "");
    setAutonomyLevel(agent.autonomy_level);
  }, [agent]);

  // Track if anything changed
  const hasChanges =
    displayName !== agent.display_name ||
    role !== agent.role ||
    goal !== (agent.goal || "") ||
    backstory !== (agent.backstory || "") ||
    autonomyLevel !== agent.autonomy_level;

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || undefined,
          role: role || undefined,
          goal: goal || undefined,
          backstory: backstory || undefined,
          autonomy_level: autonomyLevel,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save");
      }

      toast("Agent updated", "success");
      onAgentUpdated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [agent.id, tenantId, displayName, role, goal, backstory, autonomyLevel, hasChanges, saving, toast, onAgentUpdated]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-text-dim mb-1">Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent/40 focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-text-dim mb-1">Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent/40 focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-text-dim mb-1">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent/40 focus:outline-none transition-colors resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-text-dim mb-1">Backstory</label>
        <textarea
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          rows={3}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent/40 focus:outline-none transition-colors resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-text-dim mb-1">Autonomy</label>
        <select
          value={autonomyLevel}
          onChange={(e) => setAutonomyLevel(e.target.value as AutonomyLevel)}
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent/40 focus:outline-none transition-colors"
        >
          {AUTONOMY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.tag} — {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasChanges && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-bg-deep text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save changes
        </button>
      )}
    </div>
  );
}
