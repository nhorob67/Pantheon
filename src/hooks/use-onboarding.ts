"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Step1Data, Step2Data, Step3Data, Step4Data } from "@/lib/validators/onboarding";
import type { SupportedState } from "@/types/farm";
import { getTemplateDefaults } from "@/lib/templates/onboarding-templates";

interface OnboardingState {
  currentStep: number;
  selectedTemplateId: string | null;
  selectedState: SupportedState | null;
  step1: Partial<Step1Data>;
  step2: Partial<Step2Data>;
  step3: Partial<Step3Data>;
  step4: Partial<Step4Data>;
  setCurrentStep: (step: number) => void;
  setTemplate: (id: string, state: SupportedState) => void;
  applyTemplate: () => void;
  setStep1: (data: Partial<Step1Data>) => void;
  setStep2: (data: Partial<Step2Data>) => void;
  setStep3: (data: Partial<Step3Data>) => void;
  setStep4: (data: Partial<Step4Data>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  selectedTemplateId: null as string | null,
  selectedState: null as SupportedState | null,
  step1: {},
  step2: { elevators: [] },
  step3: {},
  step4: { channel_type: "discord" as const },
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setCurrentStep: (step) => set({ currentStep: step }),
      setTemplate: (id, state) =>
        set({ selectedTemplateId: id, selectedState: state }),
      applyTemplate: () => {
        const { selectedTemplateId, selectedState } = get();
        if (!selectedTemplateId || !selectedState) return;

        const defaults = getTemplateDefaults(selectedTemplateId, selectedState);
        if (!defaults) return;

        set({
          step1: defaults.step1,
          step2: defaults.step2,
          step3: defaults.step3,
        });
      },
      setStep1: (data) => set((s) => ({ step1: { ...s.step1, ...data } })),
      setStep2: (data) => set((s) => ({ step2: { ...s.step2, ...data } })),
      setStep3: (data) => set((s) => ({ step3: { ...s.step3, ...data } })),
      setStep4: (data) => set((s) => ({ step4: { ...s.step4, ...data } })),
      reset: () => set(initialState),
    }),
    {
      name: "farmclaw-onboarding",
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          // Preserve existing step data but add new fields
          return {
            ...state,
            selectedTemplateId: null,
            selectedState: null,
            // Keep their currentStep as-is (don't reset to 0)
          };
        }
        return state;
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedTemplateId: state.selectedTemplateId,
        selectedState: state.selectedState,
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        // step4 (Discord token) excluded — lives only in React memory
      }),
    }
  )
);
