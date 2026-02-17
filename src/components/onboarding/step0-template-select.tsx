"use client";

import { useState } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  ONBOARDING_TEMPLATES,
  type OnboardingTemplate,
} from "@/lib/templates/onboarding-templates";
import type { SupportedState } from "@/types/farm";
import { ArrowRight, Sprout, Wheat, LayoutGrid, Tractor } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sprout,
  Wheat,
  LayoutGrid,
  Tractor,
};

export function Step0TemplateSelect() {
  const { setTemplate, applyTemplate, setCurrentStep } = useOnboarding();
  const [selected, setSelected] = useState<OnboardingTemplate | null>(null);
  const [state, setState] = useState<SupportedState | null>(null);

  const handleGetStarted = () => {
    if (!selected || !state) return;
    setTemplate(selected.id, state);
    applyTemplate();
    setCurrentStep(1);
  };

  const handleScratch = () => {
    setCurrentStep(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-semibold mb-1">
          Choose a Template
        </h2>
        <p className="text-foreground/60 text-sm">
          Pick a starting point for your farm type. You can customize everything
          in the next steps.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ONBOARDING_TEMPLATES.map((template) => {
          const Icon = ICONS[template.icon] || Wheat;
          const isSelected = selected?.id === template.id;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setSelected(template);
                setState(null);
              }}
              className={`text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? "text-primary" : "text-foreground/40"
                    }`}
                  />
                </div>
                <h3 className="font-headline text-sm font-semibold">
                  {template.name}
                </h3>
              </div>
              <p className="text-xs text-foreground/50 mb-2">
                {template.tagline}
              </p>
              <div className="flex flex-wrap gap-1">
                {template.defaultCrops.map((crop) => (
                  <span
                    key={crop}
                    className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-foreground/60"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            Your State
          </label>
          <select
            value={state || ""}
            onChange={(e) => setState(e.target.value as SupportedState)}
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-white px-4 py-3 outline-none transition-colors"
          >
            <option value="">Select state</option>
            {selected.applicableStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={handleScratch}
          className="text-sm text-foreground/50 hover:text-foreground transition-colors underline"
        >
          Start from scratch
        </button>
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={!selected || !state}
          className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
