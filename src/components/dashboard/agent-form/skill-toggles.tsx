import {
  BUILT_IN_SKILLS,
  SKILL_INFO,
} from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import { Switch } from "@/components/ui/switch";
import { Puzzle } from "lucide-react";

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
        {BUILT_IN_SKILLS.map((skill) => {
          const info = SKILL_INFO[skill];
          const disabled = isGloballyDisabled(skill);
          const checked = skills.includes(skill);
          return (
            <div key={skill} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${disabled ? "text-text-dim" : "text-text-primary"}`}>
                  {info.label}
                  {disabled && (
                    <span className="ml-2 text-xs text-text-dim">
                      (disabled globally)
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-dim">{info.description}</p>
              </div>
              <Switch
                checked={checked && !disabled}
                onChange={() => onToggle(skill)}
                disabled={disabled}
              />
            </div>
          );
        })}

        {customSkills.length > 0 && (
          <>
            <div className="border-t border-border my-2" />
            {customSkills.map((cs) => {
              const checked = skills.includes(cs.slug);
              return (
                <div key={cs.slug} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Puzzle className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {cs.display_name}
                        <span className="ml-2 text-xs font-normal text-accent">Custom</span>
                      </p>
                      <p className="text-xs text-text-dim">{cs.description || cs.slug}</p>
                    </div>
                  </div>
                  <Switch
                    checked={checked}
                    onChange={() => onToggle(cs.slug)}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
