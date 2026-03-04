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
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { PresetGrid } from "./preset-grid";
import { SkillToggles } from "./skill-toggles";
import { CronToggles } from "./cron-toggles";

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAgentData) => Promise<void>;
  editAgent?: Agent | null;
  globalSkillConfigs: SkillConfig[];
  customSkills?: CustomSkill[];
}

export function AgentForm({
  open,
  onClose,
  onSubmit,
  editAgent,
  globalSkillConfigs,
  customSkills = [],
}: AgentFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const personalityPreset = useWatch({ control, name: "personality_preset" });
  const skills = useWatch({ control, name: "skills" }) || [];
  const cronJobs = useWatch({ control, name: "cron_jobs" }) || {};

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setError(null);
    }
  }, [open, defaultValues, reset]);

  const handlePresetChange = (preset: PersonalityPreset) => {
    setValue("personality_preset", preset, { shouldValidate: true });
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

        {/* Custom Personality Textarea */}
        {personalityPreset === "custom" && (
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Custom Personality
            </label>
            <textarea
              {...register("custom_personality")}
              rows={4}
              placeholder="Describe this assistant's personality, focus areas, and communication style..."
              className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim resize-y"
            />
            {errors.custom_personality && (
              <p className="text-red-400 text-sm mt-1">
                {errors.custom_personality.message}
              </p>
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

        {/* Scheduled Messages */}
        <CronToggles
          cronJobs={cronJobs as Record<string, boolean>}
          skills={skills as string[]}
          isGloballyDisabled={isGloballyDisabled}
          onToggle={toggleCron}
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
    </Dialog>
  );
}
