"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { Agent, ToolApprovalLevel } from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import { useToast } from "@/components/ui/toast";
import { SkillToggles } from "@/components/dashboard/agent-form/skill-toggles";
import { ComposioToolkitToggles } from "@/components/dashboard/agent-form/composio-toolkit-toggles";
import { ToolControls } from "@/components/dashboard/agent-form/tool-controls";

interface InspectorSkillsSectionProps {
  agent: Agent;
  tenantId: string;
  customSkills: CustomSkill[];
  skillConfigs: SkillConfig[];
  composioConfig: ComposioConfig | null;
  onAgentUpdated: () => void;
}

function normalizeToolOverrides(
  overrides: Record<string, ToolApprovalLevel> | undefined
): Record<string, ToolApprovalLevel> {
  return overrides && typeof overrides === "object" ? { ...overrides } : {};
}

export function InspectorSkillsSection({
  agent,
  tenantId,
  customSkills,
  skillConfigs,
  composioConfig,
  onAgentUpdated,
}: InspectorSkillsSectionProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(agent.skills || []);
  const [selectedToolkits, setSelectedToolkits] = useState<string[]>(agent.composio_toolkits || []);
  const [toolOverrides, setToolOverrides] = useState<Record<string, ToolApprovalLevel>>(
    normalizeToolOverrides(agent.tool_approval_overrides)
  );
  const [toolControlsExpanded, setToolControlsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset local state when agent changes using key-derived check
  const [prevAgentId, setPrevAgentId] = useState(agent.id);
  if (agent.id !== prevAgentId) {
    setPrevAgentId(agent.id);
    setSelectedSkills(agent.skills || []);
    setSelectedToolkits(agent.composio_toolkits || []);
    setToolOverrides(normalizeToolOverrides(agent.tool_approval_overrides));
    setToolControlsExpanded(false);
  }

  const isGloballyDisabled = useCallback(
    (skillName: string) => {
      const config = skillConfigs.find((s) => s.skill_name === skillName);
      return config ? !config.enabled : false;
    },
    [skillConfigs]
  );

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((entry) => entry !== skill)
        : [...current, skill]
    );
  }, []);

  const toggleComposioToolkit = useCallback((id: string) => {
    setSelectedToolkits((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    );
  }, []);

  const setToolApproval = useCallback((toolKey: string, level: ToolApprovalLevel) => {
    setToolOverrides((current) => {
      const next = { ...current };
      if (level === "auto") {
        delete next[toolKey];
      } else {
        next[toolKey] = level;
      }
      return next;
    });
  }, []);

  const composioEnabled = !!(
    composioConfig?.enabled &&
    Array.isArray(composioConfig.selected_toolkits) &&
    composioConfig.selected_toolkits.length > 0
  );

  const connectedAppIds = useMemo(
    () =>
      new Set(
        (composioConfig?.connected_apps ?? [])
          .filter((app) => app.status === "connected")
          .map((app) => app.app_id)
      ),
    [composioConfig]
  );

  const hasChanges = useMemo(() => {
    const originalSkills = [...(agent.skills || [])].sort().join("|");
    const nextSkills = [...selectedSkills].sort().join("|");
    const originalToolkits = [...(agent.composio_toolkits || [])].sort().join("|");
    const nextToolkits = [...selectedToolkits].sort().join("|");
    const originalOverrides = JSON.stringify(normalizeToolOverrides(agent.tool_approval_overrides));
    const nextOverrides = JSON.stringify(toolOverrides);

    return (
      originalSkills !== nextSkills ||
      originalToolkits !== nextToolkits ||
      originalOverrides !== nextOverrides
    );
  }, [agent.skills, agent.composio_toolkits, agent.tool_approval_overrides, selectedSkills, selectedToolkits, toolOverrides]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: selectedSkills,
          composio_toolkits: selectedToolkits,
          tool_approval_overrides: toolOverrides,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to save");
      }

      toast("Skills and tools updated", "success");
      onAgentUpdated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [agent.id, tenantId, selectedSkills, selectedToolkits, toolOverrides, hasChanges, saving, toast, onAgentUpdated]);

  return (
    <div className="space-y-4">
      <SkillToggles
        skills={selectedSkills}
        customSkills={customSkills}
        isGloballyDisabled={isGloballyDisabled}
        onToggle={toggleSkill}
      />

      {composioEnabled && (
        <ComposioToolkitToggles
          enabledToolkits={composioConfig?.selected_toolkits || []}
          connectedAppIds={connectedAppIds}
          selected={selectedToolkits}
          onToggle={toggleComposioToolkit}
        />
      )}

      <ToolControls
        skills={selectedSkills}
        overrides={toolOverrides}
        onChangeLevel={setToolApproval}
        expanded={toolControlsExpanded}
        onToggleExpanded={() => setToolControlsExpanded((current) => !current)}
      />

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
