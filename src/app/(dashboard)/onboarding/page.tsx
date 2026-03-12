"use client";

import { useOnboardingStep } from "@/hooks/use-onboarding";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { Step1Team } from "@/components/onboarding/step1-team";
import { Step2Agent } from "@/components/onboarding/step2-agent";
import { Step3Discord } from "@/components/onboarding/step3-discord";

export default function OnboardingPage() {
  const currentStep = useOnboardingStep();

  return (
    <WizardShell>
      {currentStep === 0 && <Step1Team />}
      {currentStep === 1 && <Step2Agent />}
      {currentStep === 2 && <Step3Discord />}
    </WizardShell>
  );
}
