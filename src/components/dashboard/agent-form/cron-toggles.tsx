import {
  AVAILABLE_CRON_JOBS,
  CRON_JOB_INFO,
  SKILL_INFO,
} from "@/types/agent";
import type { AvailableCronJob } from "@/types/agent";
import { Switch } from "@/components/ui/switch";
import { CalendarPlus, Clock } from "lucide-react";

interface CustomScheduleSummary {
  id: string;
  display_name: string | null;
  cron_expression: string;
  enabled: boolean;
}

interface CronTogglesProps {
  cronJobs: Record<string, boolean>;
  skills: string[];
  isGloballyDisabled: (skillName: string) => boolean;
  onToggle: (cron: AvailableCronJob) => void;
  customSchedules?: CustomScheduleSummary[];
  onAddCustomSchedule?: () => void;
}

export function CronToggles({
  cronJobs,
  skills,
  isGloballyDisabled,
  onToggle,
  customSchedules,
  onAddCustomSchedule,
}: CronTogglesProps) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-2">
        Scheduled Messages
      </label>
      <div className="space-y-3">
        {AVAILABLE_CRON_JOBS.map((cron) => {
          const info = CRON_JOB_INFO[cron];
          const skillDisabled =
            !skills.includes(info.requiredSkill) ||
            isGloballyDisabled(info.requiredSkill);
          const checked = !!cronJobs[cron];
          return (
            <div key={cron} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${skillDisabled ? "text-text-dim" : "text-text-primary"}`}>
                  {info.label}
                  {skillDisabled && (
                    <span className="ml-2 text-xs text-text-dim">
                      (requires {SKILL_INFO[info.requiredSkill].label})
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-dim">{info.description}</p>
              </div>
              <Switch
                checked={checked && !skillDisabled}
                onChange={() => onToggle(cron)}
                disabled={skillDisabled}
              />
            </div>
          );
        })}
      </div>

      {/* Custom schedules for this agent */}
      {customSchedules && customSchedules.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <label className="block text-sm text-text-secondary mb-2">
            Custom Schedules
          </label>
          <div className="space-y-2">
            {customSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center gap-2 text-sm text-foreground/70"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {schedule.display_name || schedule.cron_expression}
                </span>
                <span className="ml-auto text-xs text-foreground/40">
                  {schedule.enabled ? (
                    <span className="text-primary">Active</span>
                  ) : (
                    "Disabled"
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onAddCustomSchedule && (
        <button
          type="button"
          onClick={onAddCustomSchedule}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
        >
          <Clock className="w-3 h-3" />
          Add custom schedule
        </button>
      )}
    </div>
  );
}
