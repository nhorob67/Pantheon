"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboardingAgent, useOnboardingActions } from "@/hooks/use-onboarding";
import {
  firstAgentSchema,
  type FirstAgentData,
} from "@/lib/validators/onboarding";
import {
  AGENT_TEMPLATES,
  ONBOARDING_AGENT_TEMPLATE_IDS,
  type AgentTemplateDraft,
} from "@/lib/templates/agent-templates";
import { Textarea } from "@/components/ui/textarea";
import { AUTONOMY_OPTIONS } from "@/types/agent";
import { Bot, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Zap, Wand2, Loader2 } from "lucide-react";
import { m } from "motion/react";
import { useState } from "react";

const AUTONOMY_ICONS: Record<string, React.ElementType> = {
  assisted: ShieldCheck,
  copilot: Sparkles,
  autopilot: Zap,
};

export function Step2Agent() {
  const agent = useOnboardingAgent();
  const { setAgent, setCurrentStep } = useOnboardingActions();
  const [nlDescription, setNlDescription] = useState("");
  const [nlGenerating, setNlGenerating] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const curatedTemplates = AGENT_TEMPLATES.filter((template) =>
    ONBOARDING_AGENT_TEMPLATE_IDS.includes(
      template.id as (typeof ONBOARDING_AGENT_TEMPLATE_IDS)[number]
    )
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FirstAgentData>({
    resolver: zodResolver(firstAgentSchema),
    defaultValues: {
      display_name: agent.display_name ?? "",
      role: agent.role ?? "",
      goal: agent.goal ?? "",
      backstory: agent.backstory ?? "",
      autonomy_level: agent.autonomy_level ?? "copilot",
    },
  });

  const handleNlGenerate = async () => {
    if (nlDescription.length < 10) {
      setNlError("Please describe your agent in at least 10 characters");
      return;
    }
    setNlGenerating(true);
    setNlError(null);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: nlDescription }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.agent) {
        reset({
          display_name: data.agent.display_name ?? "",
          role: data.agent.role ?? "",
          goal: data.agent.goal ?? "",
          backstory: data.agent.backstory ?? "",
          autonomy_level: data.agent.autonomy_level ?? "copilot",
        });
      }
    } catch {
      setNlError("Could not generate agent. Try a template or fill manually.");
    }
    setNlGenerating(false);
  };

  const applyTemplate = (template: AgentTemplateDraft | null) => {
    reset({
      display_name: template?.suggested_name ?? "",
      role: template?.role ?? "",
      goal: template?.goal ?? "",
      backstory: template?.backstory ?? "",
      autonomy_level: template?.autonomy_level ?? "copilot",
    });
  };

  const onSubmit = (data: FirstAgentData) => {
    setAgent(data);
    setCurrentStep(2);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-5 h-5 text-accent" />
          <h2 className="font-headline text-2xl text-text-primary">
            Create Your First Agent
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Define the first member of your AI team. You can add more agents later.
        </p>
      </m.div>

      {/* Natural Language Agent Creation */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
        className="rounded-xl border border-border bg-bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-text-primary">
            Describe your agent
          </p>
        </div>
        <Textarea
          value={nlDescription}
          onChange={(e) => setNlDescription(e.target.value)}
          rows={2}
          placeholder="e.g. I need an agent that handles customer support tickets, is friendly but professional, and escalates complex issues"
          className="w-full bg-bg-dark text-sm resize-none mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNlGenerate}
            disabled={nlGenerating}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-light px-5 py-2 text-sm font-semibold text-bg-deep transition-all hover:shadow-[0_4px_20px_rgba(196,136,63,0.3)] disabled:opacity-50"
          >
            {nlGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {nlGenerating ? "Generating..." : "Generate Agent"}
          </button>
          {nlError && (
            <p className="text-xs text-destructive">{nlError}</p>
          )}
        </div>
      </m.div>

      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-dim">Or configure manually</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              Starting Point
            </p>
            <p className="text-xs text-text-dim">
              Use a starter template or fill the form yourself.
            </p>
          </div>
          <button
            type="button"
            onClick={() => applyTemplate(null)}
            className="text-xs font-medium text-accent hover:text-accent-light transition-colors"
          >
            Start from scratch
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {curatedTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-accent hover:bg-accent-dim"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">
                  {template.label}
                </p>
                <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-dim">
                  {template.autonomy_level}
                </span>
              </div>
              <p className="mt-2 text-xs text-text-dim">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </m.div>

      {/* Agent Name */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Agent Name
        </label>
        <input
          {...register("display_name")}
          placeholder="e.g. Support Bot"
          className="w-full bg-bg-card border border-border focus:border-accent focus:ring-2 focus:ring-accent-dim rounded-xl px-4 py-3 text-text-primary placeholder:text-text-dim outline-none transition-all"
        />
        {errors.display_name && (
          <p className="text-destructive text-xs mt-1">
            {errors.display_name.message}
          </p>
        )}
      </m.div>

      {/* Role */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Role
          <span className="ml-2 text-xs font-normal text-text-dim">
            What is this agent?
          </span>
        </label>
        <input
          {...register("role")}
          placeholder="e.g. Customer support specialist"
          className="w-full bg-bg-card border border-border focus:border-accent focus:ring-2 focus:ring-accent-dim rounded-xl px-4 py-3 text-text-primary placeholder:text-text-dim outline-none transition-all"
        />
        {errors.role && (
          <p className="text-destructive text-xs mt-1">{errors.role.message}</p>
        )}
      </m.div>

      {/* Goal */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Goal
          <span className="ml-2 text-xs font-normal text-text-dim">
            What should this agent accomplish?
          </span>
        </label>
        <Textarea
          {...register("goal")}
          rows={2}
          placeholder="e.g. Resolve customer questions quickly and accurately using our knowledge base"
          className="w-full bg-bg-card rounded-xl resize-none"
          error={errors.goal?.message}
        />
      </m.div>

      {/* Backstory */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Backstory
          <span className="ml-2 text-xs font-normal text-text-dim">
            (optional) Personality, tone, and constraints
          </span>
        </label>
        <Textarea
          {...register("backstory")}
          rows={3}
          placeholder="e.g. You are friendly but concise. Always cite sources. Never make up information."
          className="w-full bg-bg-card rounded-xl resize-none"
          error={errors.backstory?.message}
        />
      </m.div>

      {/* Autonomy Level */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-3">
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
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      selected
                        ? "border-accent bg-accent-dim shadow-[0_0_20px_rgba(196,136,63,0.1)]"
                        : "border-border bg-bg-card hover:border-border-light hover:bg-bg-card-hover"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        selected ? "text-accent" : "text-text-dim"
                      }`}
                    />
                    <div className="text-center">
                      <p
                        className={`text-sm font-semibold ${
                          selected
                            ? "text-accent"
                            : "text-text-primary"
                        }`}
                      >
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
        {errors.autonomy_level && (
          <p className="text-destructive text-xs mt-1">
            {errors.autonomy_level.message}
          </p>
        )}
      </m.div>

      {/* Navigation */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3 pt-2"
      >
        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="px-6 py-3.5 rounded-full border border-border text-text-secondary font-medium hover:border-border-light hover:text-text-primary transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-accent to-accent-light text-bg-deep font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(196,136,63,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </m.div>
    </form>
  );
}
