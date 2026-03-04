import {
  AVAILABLE_CRON_JOBS,
  CRON_JOB_INFO,
  SKILL_INFO,
} from "@/types/agent";
import type { AvailableCronJob } from "@/types/agent";
import { Switch } from "@/components/ui/switch";

interface CronTogglesProps {
  cronJobs: Record<string, boolean>;
  skills: string[];
  isGloballyDisabled: (skillName: string) => boolean;
  onToggle: (cron: AvailableCronJob) => void;
}

export function CronToggles({ cronJobs, skills, isGloballyDisabled, onToggle }: CronTogglesProps) {
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
    </div>
  );
}
