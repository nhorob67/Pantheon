"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { Check } from "lucide-react";

const STEPS = [
  { num: 0, label: "Template" },
  { num: 1, label: "Farm Profile" },
  { num: 2, label: "Grain Marketing" },
  { num: 3, label: "Weather & Location" },
  { num: 4, label: "Connect Channel" },
  { num: 5, label: "Review & Launch" },
];

interface WizardShellProps {
  children: React.ReactNode;
}

export function WizardShell({ children }: WizardShellProps) {
  const { currentStep } = useOnboarding();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep > step.num
                    ? "bg-primary text-white"
                    : currentStep === step.num
                      ? "bg-energy text-white"
                      : "bg-muted text-foreground/40"
                }`}
              >
                {currentStep > step.num ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.num + 1
                )}
              </div>
              <span
                className={`text-xs mt-1.5 hidden sm:block ${
                  currentStep >= step.num
                    ? "text-foreground"
                    : "text-foreground/40"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-6 sm:w-12 mx-1 sm:mx-2 ${
                  currentStep > step.num ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-muted rounded-full h-2 mb-8">
        <div
          className="bg-energy rounded-full h-2 transition-all duration-500"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        {children}
      </div>
    </div>
  );
}
