"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOnboardingTeam, useOnboardingActions } from "@/hooks/use-onboarding";
import {
  teamSetupSchema,
  type TeamSetupData,
} from "@/lib/validators/onboarding";
import { Textarea } from "@/components/ui/textarea";
import { Users, ArrowRight } from "lucide-react";
import { m } from "motion/react";
import { useEffect } from "react";

const COMMON_TIMEZONES = [
  { label: "Eastern (ET)", value: "America/New_York" },
  { label: "Central (CT)", value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HT)", value: "Pacific/Honolulu" },
  { label: "Atlantic (AT)", value: "America/Halifax" },
  { label: "Newfoundland (NT)", value: "America/St_Johns" },
  { label: "UTC", value: "UTC" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Central Europe (CET)", value: "Europe/Berlin" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Japan (JST)", value: "Asia/Tokyo" },
  { label: "Australia Eastern (AEST)", value: "Australia/Sydney" },
];

export function Step1Team() {
  const team = useOnboardingTeam();
  const { setTeam, setCurrentStep } = useOnboardingActions();

  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TeamSetupData>({
    resolver: zodResolver(teamSetupSchema),
    defaultValues: {
      team_name: team.team_name ?? "",
      team_goal: team.team_goal ?? "",
      timezone: team.timezone ?? detectedTz ?? "America/Chicago",
    },
  });

  // Auto-detect timezone on mount if not already set
  useEffect(() => {
    if (!team.timezone && detectedTz) {
      setValue("timezone", detectedTz);
    }
  }, [team.timezone, detectedTz, setValue]);

  const onSubmit = (data: TeamSetupData) => {
    setTeam(data);
    setCurrentStep(1);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="font-headline text-2xl font-bold text-text-primary">
            Name Your Team
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Your team is the workspace where your AI agents live and collaborate.
        </p>
      </m.div>

      {/* Team Name */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Team Name
        </label>
        <input
          {...register("team_name")}
          placeholder="e.g. Acme Support Team"
          className="w-full bg-bg-card border border-border focus:border-accent focus:ring-2 focus:ring-accent-dim rounded-xl px-4 py-3 text-text-primary placeholder:text-text-dim outline-none transition-all"
        />
        {errors.team_name && (
          <p className="text-destructive text-xs mt-1">
            {errors.team_name.message}
          </p>
        )}
      </m.div>

      {/* Team Goal */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          What should this team accomplish?
        </label>
        <Textarea
          {...register("team_goal")}
          rows={3}
          placeholder="e.g. Handle customer support, research competitors, manage social media..."
          className="w-full bg-bg-card rounded-xl resize-none"
          error={errors.team_goal?.message}
        />
        <p className="text-xs text-text-dim mt-1">
          This becomes the shared context for all your agents.
        </p>
      </m.div>

      {/* Timezone */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Timezone
        </label>
        <select
          {...register("timezone")}
          className="w-full bg-bg-card border border-border focus:border-accent focus:ring-2 focus:ring-accent-dim rounded-xl px-4 py-3 text-text-primary outline-none transition-all appearance-none"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        {errors.timezone && (
          <p className="text-destructive text-xs mt-1">
            {errors.timezone.message}
          </p>
        )}
      </m.div>

      {/* Continue */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="pt-2"
      >
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-accent to-accent-light text-bg-deep font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(196,136,63,0.3)] hover:-translate-y-0.5 active:translate-y-0"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </m.div>
    </form>
  );
}
