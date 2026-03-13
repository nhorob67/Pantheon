"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAgentSchema, type CreateAgentData } from "@/lib/validators/agent";
import { AUTONOMY_OPTIONS, type Agent, type AutonomyLevel, type ToolApprovalLevel } from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import { AGENT_TEMPLATES, type AgentTemplateDraft } from "@/lib/templates/agent-templates";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useMemo } from "react";
import { Loader2, ChevronDown, ShieldCheck, Sparkles, Zap, Wand2, Check } from "lucide-react";

const AUTONOMY_ICONS: Record<string, React.ElementType> = {
  assisted: ShieldCheck,
  copilot: Sparkles,
  autopilot: Zap,
};
import { SkillToggles } from "./skill-toggles";
import { ComposioToolkitToggles } from "./composio-toolkit-toggles";
import { ToolControls } from "./tool-controls";
import { CustomScheduleForm } from "./custom-schedule-form";
import { CronToggles } from "./cron-toggles";
import { useNlGeneration } from "./use-nl-generation";

const EMPTY_CUSTOM_SKILLS: CustomSkill[] = [];

interface CustomScheduleSummary {
  id: string;
  display_name: string | null;
  cron_expression: string;
  enabled: boolean;
}

function parseCustomSchedules(schedules: unknown[]): CustomScheduleSummary[] {
  return (schedules as Record<string, unknown>[])
    .filter((s) => s.schedule_type === "custom")
    .map((s) => ({
      id: s.id as string,
      display_name: s.display_name as string | null,
      cron_expression: s.cron_expression as string,
      enabled: s.enabled as boolean,
    }));
}

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAgentData) => Promise<void>;
  editAgent?: Agent | null;
  globalSkillConfigs: SkillConfig[];
  customSkills?: CustomSkill[];
  composioConfig?: ComposioConfig | null;
  tenantId?: string;
}

export function AgentForm({
  open,
  onClose,
  onSubmit,
  editAgent,
  globalSkillConfigs,
  customSkills = EMPTY_CUSTOM_SKILLS,
  composioConfig = null,
  tenantId,
}: AgentFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("scratch");
  const [customSchedules, setCustomSchedules] = useState<CustomScheduleSummary[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [customScheduleFormOpen, setCustomScheduleFormOpen] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'skills' | 'advanced'>('identity');

  const isGloballyDisabled = (skillName: string) => {
    const config = globalSkillConfigs.find((s) => s.skill_name === skillName);
    return config ? !config.enabled : false;
  };

  const defaultValues = useMemo<CreateAgentData>(
    () =>
      editAgent
        ? {
            display_name: editAgent.display_name,
            role: editAgent.role || "",
            autonomy_level: editAgent.autonomy_level || "copilot",
            discord_channel_id: editAgent.discord_channel_id || "",
            discord_channel_name: editAgent.discord_channel_name || "",
            is_default: editAgent.is_default,
            skills: (Array.isArray(editAgent.skills) ? editAgent.skills : []) as CreateAgentData["skills"],
            composio_toolkits: Array.isArray(editAgent.composio_toolkits) ? editAgent.composio_toolkits : [],
            can_delegate: editAgent.can_delegate ?? false,
            can_receive_delegation: editAgent.can_receive_delegation ?? false,
            goal: editAgent.goal || "",
            backstory: editAgent.backstory || "",
            tool_approval_overrides: editAgent.tool_approval_overrides && typeof editAgent.tool_approval_overrides === "object" ? editAgent.tool_approval_overrides : {},
          }
        : {
            display_name: "",
            role: "",
            autonomy_level: "copilot" as const,
            discord_channel_id: "",
            discord_channel_name: "",
            is_default: false,
            skills: [] as CreateAgentData["skills"],
            composio_toolkits: [],
            can_delegate: false,
            can_receive_delegation: false,
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
    mode: "onBlur",
  });

  const skills = useWatch({ control, name: "skills" }) || [];
  const composioToolkits = useWatch({ control, name: "composio_toolkits" }) || [];
  const toolApprovalOverrides = useWatch({ control, name: "tool_approval_overrides" }) || {};

  const {
    nlDescription, setNlDescription,
    nlGenerating, nlError, nlSuccess,
    resetNl, handleNlGenerate,
  } = useNlGeneration({
    defaultValues,
    reset,
    setSelectedTemplateId,
    setActiveTab,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setError(null);
      setSelectedTemplateId("scratch");
      resetNl();
      setAdvancedExpanded(
        !!(editAgent?.tool_approval_overrides && Object.keys(editAgent.tool_approval_overrides).length > 0) ||
        !!(editAgent?.composio_toolkits && editAgent.composio_toolkits.length > 0)
      );

      // Load custom schedules for this agent
      if (editAgent && tenantId) {
        setSchedulesLoading(true);
        fetch(`/api/tenants/${tenantId}/schedules?agent_id=${editAgent.id}`)
          .then((res) => res.ok ? res.json() : { data: { schedules: [] } })
          .then((payload) => {
            const schedules = Array.isArray(payload?.data?.schedules) ? payload.data.schedules : [];
            setCustomSchedules(parseCustomSchedules(schedules));
          })
          .catch(() => setCustomSchedules([]))
          .finally(() => setSchedulesLoading(false));
      } else {
        setCustomSchedules([]);
      }
    }
  }, [open, defaultValues, reset, editAgent, tenantId]);

  const applyTemplate = (template: AgentTemplateDraft | null) => {
    if (editAgent) {
      return;
    }

    setSelectedTemplateId(template?.id ?? "scratch");
    reset(
      template
        ? {
            ...defaultValues,
            display_name: template.suggested_name,
            role: template.role,
            goal: template.goal,
            backstory: template.backstory,
            autonomy_level: template.autonomy_level,
            can_delegate: template.can_delegate,
            can_receive_delegation: template.can_receive_delegation,
            skills: template.skills,
          }
        : defaultValues
    );
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

  const toggleComposioToolkit = (id: string) => {
    const current = composioToolkits as string[];
    const next = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    setValue("composio_toolkits", next, { shouldValidate: true });
  };

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
    if (editAgent && tenantId) {
      fetch(`/api/tenants/${tenantId}/schedules?agent_id=${editAgent.id}`)
        .then((res) => res.ok ? res.json() : { data: { schedules: [] } })
        .then((payload) => {
          const schedules = Array.isArray(payload?.data?.schedules) ? payload.data.schedules : [];
          setCustomSchedules(parseCustomSchedules(schedules));
        })
        .catch(() => {});
    }
  };

  const composioEnabled = !!(composioConfig?.enabled && Array.isArray(composioConfig.selected_toolkits) && composioConfig.selected_toolkits.length > 0);
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
      title={editAgent ? "Edit Agent" : "Create Agent"}
      size="lg"
    >
      <form onSubmit={handleSubmit(doSubmit)} className="space-y-6">
        {!editAgent && (
          <>
          {/* NL Agent Generation */}
          <div className="rounded-xl border border-border bg-bg-dark p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold text-text-primary">
                Describe your agent
              </p>
            </div>
            <textarea
              value={nlDescription}
              onChange={(e) => setNlDescription(e.target.value)}
              rows={2}
              placeholder="e.g. I need an agent that handles customer support tickets, is friendly but professional, and escalates complex issues"
              className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-deep px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none transition-colors resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNlGenerate}
                disabled={nlGenerating || nlSuccess}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                  nlSuccess
                    ? "bg-[var(--green-bright)] text-bg-deep"
                    : "bg-accent hover:bg-accent-light text-bg-deep"
                }`}
              >
                {nlGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : nlSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {nlGenerating ? "Generating..." : nlSuccess ? "Fields populated!" : "Generate Agent"}
              </button>
              {nlError && (
                <p className="text-xs text-destructive">{nlError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-dim">Or pick a starting point</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="text-xs font-mono tracking-[0.12em] uppercase text-text-dim px-2">
              Templates
            </legend>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => applyTemplate(null)}
                className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  selectedTemplateId === "scratch"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-bg-dark hover:border-border-light"
                }`}
              >
                <p className="text-sm font-semibold text-text-primary">Start from scratch</p>
                <p className="mt-1 text-xs text-text-dim">
                  Begin with a blank agent and define every field yourself.
                </p>
              </button>

              {AGENT_TEMPLATES.map((template) => {
                const selected = selectedTemplateId === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-bg-dark hover:border-border-light"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {template.label}
                        </p>
                        <p className="mt-1 text-xs text-text-dim">
                          {template.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                        {template.autonomy_level}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-text-dim">
              Templates only prefill the form. Saved agents keep explicit fields only and are not linked to a template at runtime.
            </p>
          </fieldset>
          </>
        )}

        {/* ── TAB BAR ─────────────────────────────── */}
        <div className="flex border-b border-border mb-6">
          {[
            { id: 'identity', label: 'Identity', fields: ['name', 'role', 'goal', 'backstory'] },
            { id: 'skills', label: 'Skills & Tools' },
            { id: 'advanced', label: 'Schedules & Advanced' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-foreground/50 hover:text-foreground/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── IDENTITY TAB ───────────────────────────── */}
        {activeTab === 'identity' && (
          <>
            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="text-xs font-mono tracking-[0.12em] uppercase text-text-dim px-2">
                Identity
              </legend>

              {/* Agent Name */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Agent Name <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("display_name")}
                  placeholder="e.g. Support Bot"
                  className={`w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim${nlSuccess ? " nl-highlight" : ""}`}
                />
                {errors.display_name && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.display_name.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Role <span className="text-destructive">*</span>
                  <span className="ml-2 text-xs font-normal text-text-dim">
                    What is this agent?
                  </span>
                </label>
                <input
                  {...register("role")}
                  placeholder="e.g. Customer support specialist"
                  className={`w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim${nlSuccess ? " nl-highlight" : ""}`}
                />
                {errors.role && (
                  <p className="text-destructive text-sm mt-1">{errors.role.message}</p>
                )}
              </div>

              {/* Goal */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Goal
                  <span className="ml-2 text-xs font-normal text-text-dim">
                    What should this agent accomplish?
                  </span>
                </label>
                <textarea
                  {...register("goal")}
                  rows={2}
                  placeholder="e.g. Resolve customer questions quickly and accurately"
                  className={`w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-y${nlSuccess ? " nl-highlight" : ""}`}
                />
                {errors.goal && (
                  <p className="text-destructive text-sm mt-1">{errors.goal.message}</p>
                )}
              </div>

              {/* Backstory */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Backstory
                  <span className="ml-2 text-xs font-normal text-text-dim">
                    (optional) Personality, tone, and constraints
                  </span>
                </label>
                <textarea
                  {...register("backstory")}
                  rows={3}
                  placeholder="e.g. You are friendly but concise. Always cite sources. Never make up information."
                  className={`w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-y${nlSuccess ? " nl-highlight" : ""}`}
                />
                {errors.backstory && (
                  <p className="text-destructive text-sm mt-1">{errors.backstory.message}</p>
                )}
              </div>
            </fieldset>

            {/* ── BEHAVIOR ─────────────────────────────── */}
            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="text-xs font-mono tracking-[0.12em] uppercase text-text-dim px-2">
                Behavior
              </legend>

              {/* Autonomy Level */}
              <div>
                <label className="block text-sm text-text-secondary mb-3">
                  Autonomy Level
                </label>
                <Controller
                  control={control}
                  name="autonomy_level"
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-3">
                      {AUTONOMY_OPTIONS.map((opt) => {
                        const selected = field.value === opt.value;
                        const Icon = AUTONOMY_ICONS[opt.value] ?? Sparkles;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                              selected
                                ? "border-accent bg-accent/10 shadow-[0_0_16px_rgba(196,136,63,0.08)]"
                                : "border-border hover:border-border-light hover:bg-border"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${selected ? "text-accent" : "text-text-dim"}`}
                            />
                            <div className="text-center">
                              <p className={`text-xs font-semibold ${selected ? "text-accent" : "text-text-primary"}`}>
                                {opt.label}
                              </p>
                              <p className="text-[10px] text-text-dim mt-0.5">
                                {opt.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>

              {/* Delegation */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Can delegate tasks
                  </p>
                  <p className="text-xs text-text-dim">
                    Allow this agent to hand off tasks to other agents
                  </p>
                </div>
                <Controller
                  control={control}
                  name="can_delegate"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Can receive delegated tasks
                  </p>
                  <p className="text-xs text-text-dim">
                    Allow other agents to send work to this agent
                  </p>
                </div>
                <Controller
                  control={control}
                  name="can_receive_delegation"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </fieldset>

            {/* ── DISCORD CHANNEL ─────────────────────── */}
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="text-xs font-mono tracking-[0.12em] uppercase text-text-dim px-2">
                Discord Channel
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    {...register("discord_channel_id")}
                    placeholder="Channel ID (17-20 digits)"
                    className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim font-mono text-sm"
                  />
                  {errors.discord_channel_id && (
                    <p className="text-destructive text-sm mt-1">
                      {errors.discord_channel_id.message}
                    </p>
                  )}
                </div>
                <input
                  {...register("discord_channel_name")}
                  placeholder="Display name (e.g. #support)"
                  className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-3 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm"
                />
              </div>
              <p className="text-xs text-text-dim">
                Leave empty for the default agent (handles all unbound channels & DMs).
              </p>

              {/* Default toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Default Agent
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
            </fieldset>
          </>
        )}

        {/* ── SKILLS & TOOLS TAB ─────────────────────── */}
        {activeTab === 'skills' && (
          <>
            <SkillToggles
              skills={skills as string[]}
              customSkills={customSkills}
              isGloballyDisabled={isGloballyDisabled}
              onToggle={toggleSkill}
            />

            <ToolControls
              skills={skills as string[]}
              overrides={toolApprovalOverrides as Record<string, ToolApprovalLevel>}
              onChangeLevel={setToolApproval}
              expanded={true}
              onToggleExpanded={() => {}}
            />

            {composioEnabled && (
              <ComposioToolkitToggles
                enabledToolkits={composioConfig!.selected_toolkits}
                connectedAppIds={connectedAppIds}
                selected={composioToolkits as string[]}
                onToggle={toggleComposioToolkit}
              />
            )}
          </>
        )}

        {/* ── SCHEDULES & ADVANCED TAB ───────────────── */}
        {activeTab === 'advanced' && (
          <>
            {schedulesLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-foreground/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading schedules…
              </div>
            ) : (
            <CronToggles
              customSchedules={customSchedules}
              onAddCustomSchedule={editAgent && tenantId ? () => setCustomScheduleFormOpen(true) : undefined}
              onToggleCustomSchedule={tenantId ? handleToggleCustomSchedule : undefined}
              onDeleteCustomSchedule={tenantId ? handleDeleteCustomSchedule : undefined}
            />
            )}

            <div>
              <button
                type="button"
                onClick={() => setAdvancedExpanded((v) => !v)}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer w-full text-left"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${advancedExpanded ? "rotate-0" : "-rotate-90"}`}
                />
                <span className="font-medium">Advanced Options</span>
              </button>

              {advancedExpanded && (
                <div className="mt-3 space-y-4">
                  {/* Reserved for future advanced settings */}
                </div>
              )}
            </div>
          </>
        )}

        {/* Error + Submit */}
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-border transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editAgent ? "Save Changes" : "Create Agent"}
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
