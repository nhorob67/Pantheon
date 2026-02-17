"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { Step0TemplateSelect } from "@/components/onboarding/step0-template-select";
import { Step1FarmProfile } from "@/components/onboarding/step1-farm-profile";
import { Step2GrainMarketing } from "@/components/onboarding/step2-grain-marketing";
import { Step3Location } from "@/components/onboarding/step3-location";
import { Step4Channel } from "@/components/onboarding/step4-channel";
import { Step5Review } from "@/components/onboarding/step5-review";

export default function OnboardingPage() {
  const { currentStep } = useOnboarding();

  return (
    <div className="py-4">
      <WizardShell>
        {currentStep === 0 && <Step0TemplateSelect />}
        {currentStep === 1 && <Step1FarmProfile />}
        {currentStep === 2 && <Step2GrainMarketing />}
        {currentStep === 3 && <Step3Location />}
        {currentStep === 4 && <Step4Channel />}
        {currentStep === 5 && <Step5Review />}
      </WizardShell>
    </div>
  );
}
