"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentSchema, type CreateAgentData } from "@/lib/validators/agent";
import {
  PRESET_DEFAULT_SKILLS,
  PRESET_DEFAULT_CRONS,
} from "@/types/agent";
import type {
  Agent,
  PersonalityPreset,
  AvailableCronJob,
} from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { ToolApprovalLevel } from "@/types/agent";
import { useState, useEffect, useMemo } from "react";
import { Loader2, ChevronDown, RotateCcw } from "lucide-react";
import { PresetGrid } from "./preset-grid";
import { SkillToggles } from "./skill-toggles";
import { CronToggles } from "./cron-toggles";
import { ComposioToolkitToggles } from "./composio-toolkit-toggles";
import { ToolControls } from "./tool-controls";
import { CustomScheduleForm } from "./custom-schedule-form";

interface CustomScheduleSummary {
  id: string;
  display_name: string | null;
  cron_expression: string;
  enabled: boolean;
}

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAgentData) => Promise<void>;
  editAgent?: Agent | null;
  globalSkillConfigs: SkillConfig[];
  customSkills?: CustomSkill[];
  composioConfig?: ComposioConfig | null;
  defaultPrompts?: Partial<Record<PersonalityPreset, string>>;
  tenantId?: string;
}

export function AgentForm({
  open,
  onClose,
  onSubmit,
  editAgent,
  globalSkillConfigs,
  customSkills = [],
  composioConfig = null,
  defaultPrompts = {},
  tenantId,
}: AgentFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customSchedules, setCustomSchedules] = useState<CustomScheduleSummary[]>([]);
  const [customScheduleFormOpen, setCustomScheduleFormOpen] = useState(false);

  const isGloballyDisabled = (skillName: string) => {
    const config = globalSkillConfigs.find((s) => s.skill_name === skillName);
    return config ? !config.enabled : false;
  };

  const defaultValues = useMemo<CreateAgentData>(
    () =>
      editAgent
        ? {
            display_name: editAgent.display_name,
            personality_preset: editAgent.personality_preset,
            custom_personality: editAgent.custom_personality || undefined,
            discord_channel_id: editAgent.discord_channel_id || "",
            discord_channel_name: editAgent.discord_channel_name || "",
            is_default: editAgent.is_default,
            skills: editAgent.skills as CreateAgentData["skills"],
            cron_jobs: (editAgent.cron_jobs || {}) as CreateAgentData["cron_jobs"],
            composio_toolkits: editAgent.composio_toolkits ?? [],
            goal: editAgent.goal || "",
            backstory: editAgent.backstory || "",
            tool_approval_overrides: editAgent.tool_approval_overrides ?? {},
          }
        : {
            display_name: "",
            personality_preset: "general",
            custom_personality: undefined,
            discord_channel_id: "",
            discord_channel_name: "",
            is_default: false,
            skills: [...PRESET_DEFAULT_SKILLS.general] as CreateAgentData["skills"],
            cron_jobs: Object.fromEntries(
              PRESET_DEFAULT_CRONS.general.map((c) => [c, true])
            ) as CreateAgentData["cron_jobs"],
            composio_toolkits: [],
            goal: "",
            backstory: "",
            tool_approval_overrides: {},
          },
    [editAgent]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAgentData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues,
  });

  const [promptExpanded, setPromptExpanded] = useState(false);
  const [goalExpanded, setGoalExpanded] = useState(false);
  const [toolControlsExpanded, setToolControlsExpanded] = useState(false);

  const personalityPreset = useWatch({ control, name: "personality_preset" });
  const skills = useWatch({ control, name: "skills" }) || [];
  const cronJobs = useWatch({ control, name: "cron_jobs" }) || {};
  const composioToolkits = useWatch({ control, name: "composio_toolkits" }) || [];

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setError(null);
      // Auto-expand if editing an agent with a custom prompt override on a non-custom preset
      const hasCustom = editAgent?.custom_personality && editAgent.custom_personality.length > 0;
      setPromptExpanded(editAgent?.personality_preset === "custom" || !!hasCustom);
      setGoalExpanded(!!(editAgent?.goal || editAgent?.backstory));
      setToolControlsExpanded(!!editAgent?.tool_approval_overrides && Object.keys(editAgent.tool_approval_overrides).length > 0);

      // Load custom schedules for this agent
      if (editAgent && tenantId) {
        fetch(`/api/tenants/${tenantId}/schedules?agent_id=${editAgent.id}`)
          .then((res) => res.ok ? res.json() : { data: { schedules: [] } })
          .then((payload) => {
            const schedules = Array.isArray(payload?.data?.schedules) ? payload.data.schedules : [];
            setCustomSchedules(
              schedules
                .filter((s: Record<string, unknown>) => s.schedule_type === "custom")
                .map((s: Record<string, unknown>) => ({
                  id: s.id as string,
                  display_name: s.display_name as string | null,
                  cron_expression: s.cron_expression as string,
                  enabled: s.enabled as boolean,
                }))
            );
          })
          .catch(() => setCustomSchedules([]));
      } else {
        setCustomSchedules([]);
      }
    }
  }, [open, defaultValues, reset, editAgent, tenantId]);

  const currentDefaultPrompt = useMemo(
    () => (personalityPreset !== "custom" ? defaultPrompts[personalityPreset] ?? "" : ""),
    [personalityPreset, defaultPrompts]
  );

  const handlePresetChange = (preset: PersonalityPreset) => {
    setValue("personality_preset", preset, { shouldValidate: true });
    setValue("custom_personality", undefined, { shouldValidate: true });
    setPromptExpanded(preset === "custom");
    if (!editAgent) {
      const defaultSkills = PRESET_DEFAULT_SKILLS[preset];
      setValue("skills", [...defaultSkills] as CreateAgentData["skills"]);
      const defaultCrons = Object.fromEntries(
        PRESET_DEFAULT_CRONS[preset].map((c) => [c, true])
      ) as CreateAgentData["cron_jobs"];
      setValue("cron_jobs", defaultCrons);
    }
  };

  const toggleSkill = (skill: string) => {
    const current = skills as string[];
    const next = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    setValue("skills", next as CreateAgentData["skills"], {
      shouldValidate: true,
    });
  };

  const toggleCron = (cron: AvailableCronJob) => {
    const current = cronJobs as Record<string, boolean>;
    setValue(
      "cron_jobs",
      { ...current, [cron]: !current[cron] } as CreateAgentData["cron_jobs"],
      { shouldValidate: true }
    );
  };

  const toggleComposioToolkit = (id: string) => {
    const current = composioToolkits as string[];
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    setValue("composio_toolkits", next, { shouldValidate: true });
  };

  const toolApprovalOverrides = useWatch({ control, name: "tool_approval_overrides" }) || {};

  const setToolApproval = (toolKey: string, level: ToolApprovalLevel) => {
    const current = { ...(toolApprovalOverrides as Record<string, ToolApprovalLevel>) };
    if (level === "auto") {
      delete current[toolKey];
    } else {
      current[toolKey] = level;
    }
    setValue("tool_approval_overrides", current, { shouldValidate: true });
  };

  const handleToggleCustomSchedule = async (id: string, enabled: boolean) => {
    if (!tenantId) return;
    try {
      await fetch(`/api/tenants/${tenantId}/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setCustomSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
    } catch {
      // silent
    }
  };

  const handleDeleteCustomSchedule = async (id: string) => {
    if (!tenantId) return;
    try {
      await fetch(`/api/tenants/${tenantId}/schedules/${id}`, {
        method: "DELETE",
      });
      setCustomSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    }
  };

  const handleCustomScheduleCreated = () => {
    // Reload schedules
    if (editAgent && tenantId) {
      fetch(`/api/tenants/${tenantId}/schedules?agent_id=${editAgent.id}`)
        .then((res) => res.ok ? res.json() : { data: { schedules: [] } })
        .then((payload) => {
          const schedules = Array.isArray(payload?.data?.schedules) ? payload.data.schedules : [];
          setCustomSchedules(
            schedules
              .filter((s: Record<string, unknown>) => s.schedule_type === "custom")
              .map((s: Record<string, unknown>) => ({
                id: s.id as string,
                display_name: s.display_name as string | null,
                cron_expression: s.cron_expression as string,
                enabled: s.enabled as boolean,
              }))
          );
        })
        .catch(() => {});
    }
  };

  const composioEnabled = composioConfig?.enabled && (composioConfig.selected_toolkits?.length ?? 0) > 0;
  const connectedAppIds = useMemo(
    () =>
      new Set(
        (composioConfig?.connected_apps ?? [])
          .filter((a) => a.status === "connected")
          .map((a) => a.app_id)
      ),
    [composioConfig]
  );

  const doSubmit = async (data: CreateAgentData) => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editAgent ? "Edit Assistant" : "Add Assistant"}
      size="lg"
    >
      <form onSubmit={handleSubmit(doSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Name
          </label>
          <input
            {...register("display_name")}
            placeholder="e.g., Grain Market Helper"
            className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim"
          />
          {errors.display_name && (
            <p className="text-red-400 text-sm mt-1">
              {errors.display_name.message}
            </p>
          )}
        </div>

        {/* Role / Personality Preset */}
        <PresetGrid
          selected={personalityPreset}
          onSelect={handlePresetChange}
        />

        {/* Goal & Context (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setGoalExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-full text-left"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${goalExpanded ? "rotate-0" : "-rotate-90"}`}
            />
            <span className="font-medium">Goal & Context</span>
            {!goalExpanded && (
              <span className="text-text-dim text-xs ml-1">
                — optional farm-specific context for this assistant
              </span>
            )}
          </button>

          {goalExpanded && (
            <div className="mt-2 space-y-3">
              <div>
                <label className="block text-xs text-text-dim mb-1">
                  Goal <span className="text-text-dim">(max 300 chars)</span>
                </label>
                <textarea
                  {...register("goal")}
                  rows={2}
                  maxLength={300}
                  placeholder="e.g., Help me maximize basis and find the best delivery windows for my corn and soybeans"
                  className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-y"
                />
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1">
                  Backstory <span className="text-text-dim">(max 1000 chars)</span>
                </label>
                <textarea
                  {...register("backstory")}
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g., We farm 3,200 acres in the Red River Valley. We typically sell 60% at harvest and store the rest."
                  className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-y"
                />
              </div>
            </div>
          )}
        </div>

        {/* System Prompt */}
        {personalityPreset === "custom" ? (
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              System Prompt
            </label>
            <textarea
              {...register("custom_personality")}
              rows={6}
              placeholder="Describe this assistant's personality, focus areas, and communication style..."
              className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim resize-y text-sm font-mono"
            />
            {errors.custom_personality && (
              <p className="text-red-400 text-sm mt-1">
                {errors.custom_personality.message}
              </p>
            )}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setPromptExpanded((v) => !v)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-full text-left"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${promptExpanded ? "rotate-0" : "-rotate-90"}`}
              />
              <span className="font-medium">System Prompt</span>
              {!promptExpanded && (
                <span className="text-text-dim text-xs ml-1">
                  — using default. Click to customize.
                </span>
              )}
            </button>

            {promptExpanded && (
              <div className="mt-2 space-y-2">
                <textarea
                  {...register("custom_personality")}
                  rows={8}
                  placeholder={currentDefaultPrompt}
                  className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim/40 resize-y text-sm font-mono"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-dim">
                    Edit to change how this assistant thinks and responds.
                  </p>
                  <button
                    type="button"
                    onClick={() => setValue("custom_personality", undefined, { shouldValidate: true })}
                    className="inline-flex items-center gap-1.5 text-xs text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Default
                  </button>
                </div>
                {errors.custom_personality && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.custom_personality.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Discord Channel */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Discord Channel
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                {...register("discord_channel_id")}
                placeholder="Channel ID (e.g., 1234567890123456789)"
                className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim font-mono text-sm"
              />
              {errors.discord_channel_id && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.discord_channel_id.message}
                </p>
              )}
            </div>
            <input
              {...register("discord_channel_name")}
              placeholder="Display name (e.g., #grain-bids)"
              className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm"
            />
          </div>
          <p className="text-xs text-text-dim mt-1.5">
            Right-click a channel in Discord → Copy Channel ID. Leave empty for the default agent.
          </p>
        </div>

        {/* Skills */}
        <SkillToggles
          skills={skills as string[]}
          customSkills={customSkills}
          isGloballyDisabled={isGloballyDisabled}
          onToggle={toggleSkill}
        />

        {/* Connected Integrations (Composio) */}
        {composioEnabled && (
          <ComposioToolkitToggles
            enabledToolkits={composioConfig!.selected_toolkits}
            connectedAppIds={connectedAppIds}
            selected={composioToolkits as string[]}
            onToggle={toggleComposioToolkit}
          />
        )}

        {/* Tool Controls */}
        <ToolControls
          skills={skills as string[]}
          overrides={toolApprovalOverrides as Record<string, ToolApprovalLevel>}
          onChangeLevel={setToolApproval}
          expanded={toolControlsExpanded}
          onToggleExpanded={() => setToolControlsExpanded((v) => !v)}
        />

        {/* Scheduled Messages */}
        <CronToggles
          cronJobs={cronJobs as Record<string, boolean>}
          skills={skills as string[]}
          isGloballyDisabled={isGloballyDisabled}
          onToggle={toggleCron}
          customSchedules={customSchedules}
          onAddCustomSchedule={editAgent && tenantId ? () => setCustomScheduleFormOpen(true) : undefined}
          onToggleCustomSchedule={tenantId ? handleToggleCustomSchedule : undefined}
          onDeleteCustomSchedule={tenantId ? handleDeleteCustomSchedule : undefined}
        />

        {/* Default toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Default Assistant
            </p>
            <p className="text-xs text-text-dim">
              Handles all channels without a specific assignment, plus DMs
            </p>
          </div>
          <Controller
            control={control}
            name="is_default"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Error + Submit */}
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editAgent ? "Save Changes" : "Add Assistant"}
          </button>
        </div>
      </form>

      {/* Custom Schedule Form (sub-dialog) */}
      {editAgent && tenantId && (
        <CustomScheduleForm
          open={customScheduleFormOpen}
          onClose={() => setCustomScheduleFormOpen(false)}
          tenantId={tenantId}
          agentId={editAgent.id}
          channelId={editAgent.discord_channel_id}
          onCreated={handleCustomScheduleCreated}
        />
      )}
    </Dialog>
  );
}
