"use client";

import type { PersonalityPreset } from "@/lib/templates/personality-presets";
import {
  Target,
  Heart,
  Brain,
  PartyPopper,
  GraduationCap,
  Crown,
  Flame,
  Wrench,
  Users,
  Lightbulb,
  FileText,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  Heart,
  Brain,
  PartyPopper,
  GraduationCap,
  Crown,
  Flame,
  Wrench,
  Users,
  Lightbulb,
};

interface PersonalityPickerProps {
  presets: PersonalityPreset[];
  selectedId: string | null;
  onSelect: (preset: PersonalityPreset | null) => void;
  compact?: boolean;
}

export function PersonalityPicker({
  presets,
  selectedId,
  onSelect,
  compact = false,
}: PersonalityPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-text-dim">
        Choose a personality to populate the backstory, or start from scratch.
      </p>

      <div
        className={`grid gap-2 ${
          compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {/* Start from scratch */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
            selectedId === null
              ? "border-accent bg-accent/10"
              : "border-border bg-bg-dark hover:border-border-light"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText
              className={`w-4 h-4 ${
                selectedId === null ? "text-accent" : "text-text-dim"
              }`}
            />
            <p
              className={`text-sm font-semibold ${
                selectedId === null ? "text-accent" : "text-text-primary"
              }`}
            >
              From Scratch
            </p>
          </div>
          <p className="text-[11px] text-text-dim">
            Write your own backstory
          </p>
        </button>

        {presets.map((preset) => {
          const selected = selectedId === preset.id;
          const Icon = ICON_MAP[preset.icon] ?? Target;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                selected
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-dark hover:border-border-light"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    selected ? "text-accent" : "text-text-dim"
                  }`}
                />
                <p
                  className={`text-sm font-semibold truncate ${
                    selected ? "text-accent" : "text-text-primary"
                  }`}
                >
                  {preset.label}
                </p>
              </div>
              <p className="text-[11px] text-text-dim line-clamp-2">
                {preset.tagline}
              </p>
              {!compact && (
                <p className="text-[10px] text-text-dim mt-1 opacity-70">
                  {preset.appeals_to}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
