import type { CustomSkill } from "@/types/custom-skill";
import { Switch } from "@/components/ui/switch";
import { Puzzle, Brain, CalendarClock } from "lucide-react";

const BUILT_IN_SKILLS = [
  { slug: "memory", label: "Memory", description: "Store and recall information across conversations", icon: Brain },
  { slug: "schedules", label: "Schedules", description: "Create and manage scheduled tasks", icon: CalendarClock },
] as const;

interface SkillTogglesProps {
  skills: string[];
  customSkills: CustomSkill[];
  isGloballyDisabled: (skillName: string) => boolean;
  onToggle: (skill: string) => void;
}

export function SkillToggles({ skills, customSkills, isGloballyDisabled, onToggle }: SkillTogglesProps) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-2">
        Skills
      </label>
      <div className="space-y-3">
        {/* Built-in skills */}
        {BUILT_IN_SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <div key={skill.slug} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {skill.label}
                    <span className="ml-2 text-xs text-text-dim">(built-in)</span>
                  </p>
                  <p className="text-xs text-text-dim">{skill.description}</p>
                </div>
              </div>
              <span className="text-xs text-primary font-medium">Always on</span>
            </div>
          );
        })}

        {/* Custom skills */}
        {customSkills.map((cs) => {
          const checked = skills.includes(cs.slug);
          const disabled = isGloballyDisabled(cs.slug);
          return (
            <div key={cs.slug} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Puzzle className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className={`text-sm font-medium ${disabled ? "text-text-dim" : "text-text-primary"}`}>
                    {cs.display_name}
                    {disabled && (
                      <span className="ml-2 text-xs text-text-dim">
                        (disabled globally)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-dim">{cs.description || cs.slug}</p>
                </div>
              </div>
              <Switch
                checked={checked && !disabled}
                onChange={() => onToggle(cs.slug)}
                disabled={disabled}
              />
            </div>
          );
        })}

        {customSkills.length === 0 && (
          <p className="text-xs text-text-dim pt-1">
            No custom skills yet. Create them in Settings &rarr; Skills.
          </p>
        )}
      </div>
    </div>
  );
}
