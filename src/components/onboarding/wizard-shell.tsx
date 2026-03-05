"use client";

import { useOnboardingStep } from "@/hooks/use-onboarding";
import { Building2, MapPin, MessageSquare, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { OnboardingBackground } from "./onboarding-background";

const STEPS = [
  { num: 0, label: "Operation", icon: Building2, accent: "var(--accent)" },
  { num: 1, label: "Weather", icon: MapPin, accent: "var(--green-bright)" },
  { num: 2, label: "Discord", icon: MessageSquare, accent: "#5865F2" },
];

interface WizardShellProps {
  children: React.ReactNode;
}

export function WizardShell({ children }: WizardShellProps) {
  const currentStep = useOnboardingStep();

  return (
    <div className="relative min-h-screen flex flex-col">
      <OnboardingBackground />

      {/* Progress bar */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const isCompleted = currentStep > step.num;
            const isActive = currentStep === step.num;
            const Icon = step.icon;

            return (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-[var(--green-bright)] text-white"
                        : isActive
                          ? "border-2 shadow-[0_0_12px_rgba(217,140,46,0.3)]"
                          : "border border-[var(--border)] text-[var(--text-dim)]"
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: step.accent,
                            color: step.accent,
                            backgroundColor: `color-mix(in srgb, ${step.accent} 10%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block transition-colors ${
                      isActive
                        ? "text-[var(--text-primary)]"
                        : isCompleted
                          ? "text-[var(--green-bright)]"
                          : "text-[var(--text-dim)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[var(--green-bright)]"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
