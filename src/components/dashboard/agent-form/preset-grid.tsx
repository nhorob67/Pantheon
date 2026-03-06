import {
  PERSONALITY_PRESETS,
  PRESET_INFO,
} from "@/types/agent";
import type { PersonalityPreset } from "@/types/agent";
import { presetIcons, presetRingColor } from "./constants";

interface PresetGridProps {
  selected: PersonalityPreset;
  onSelect: (preset: PersonalityPreset) => void;
}

export function PresetGrid({ selected, onSelect }: PresetGridProps) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-2">
        Role
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PERSONALITY_PRESETS.map((preset) => {
          const info = PRESET_INFO[preset];
          const isSelected = selected === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onSelect(preset)}
              className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? `border-transparent ring-2 ${presetRingColor[preset]} bg-white/[0.05]`
                  : "border-border hover:border-border-light hover:bg-white/[0.02]"
              }`}
            >
              <span className={`shrink-0 mt-0.5 ${isSelected ? info.accent : "text-text-dim"}`}>
                {presetIcons[info.icon]}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isSelected ? "text-text-primary" : "text-text-secondary"}`}>
                  {info.label}
                </p>
                <p className="text-xs text-text-dim mt-0.5 leading-relaxed">
                  {info.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
