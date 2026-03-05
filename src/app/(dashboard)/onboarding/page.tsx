"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { Step1Operation } from "@/components/onboarding/step1-operation";
import { Step2Location } from "@/components/onboarding/step2-location";
import { Step3Discord } from "@/components/onboarding/step3-discord";

export default function OnboardingPage() {
  const { currentStep } = useOnboarding();

  return (
    <WizardShell>
      {currentStep === 0 && <Step1Operation />}
      {currentStep === 1 && <Step2Location />}
      {currentStep === 2 && <Step3Discord />}
    </WizardShell>
  );
}
