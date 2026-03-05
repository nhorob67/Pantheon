"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Country, BusinessType } from "@/types/farm";

interface OnboardingState {
  currentStep: number;
  operation: Partial<{
    operation_name: string;
    business_type: BusinessType;
    country: Country;
    state: string;
    county: string;
  }>;
  location: Partial<{
    weather_location: string;
    weather_lat: number;
    weather_lng: number;
    timezone: string;
  }>;
  discord: Partial<{
    discord_guild_id: string;
    skipped: boolean;
  }>;
  setCurrentStep: (step: number) => void;
  setOperation: (data: Partial<OnboardingState["operation"]>) => void;
  setLocation: (data: Partial<OnboardingState["location"]>) => void;
  setDiscord: (data: Partial<OnboardingState["discord"]>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  operation: { country: "US" as Country },
  location: {},
  discord: {},
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentStep: (step) => set({ currentStep: step }),
      setOperation: (data) =>
        set((s) => ({ operation: { ...s.operation, ...data } })),
      setLocation: (data) =>
        set((s) => ({ location: { ...s.location, ...data } })),
      setDiscord: (data) =>
        set((s) => ({ discord: { ...s.discord, ...data } })),
      reset: () => set(initialState),
    }),
    {
      name: "farmclaw-onboarding-v3",
      storage: createJSONStorage(() => sessionStorage),
      version: 3,
      partialize: (state) => ({
        currentStep: state.currentStep,
        operation: state.operation,
        location: state.location,
        // discord excluded from persistence (sensitive)
      }),
    }
  )
);

// Granular selectors — subscribe to minimal state
export const useOnboardingStep = () => useOnboarding((s) => s.currentStep);
export const useOnboardingOperation = () => useOnboarding((s) => s.operation);
export const useOnboardingLocation = () => useOnboarding((s) => s.location);
export const useOnboardingDiscord = () => useOnboarding((s) => s.discord);
export const useOnboardingSetCurrentStep = () =>
  useOnboarding((s) => s.setCurrentStep);
export const useOnboardingSetOperation = () => useOnboarding((s) => s.setOperation);
export const useOnboardingSetLocation = () => useOnboarding((s) => s.setLocation);
export const useOnboardingSetDiscord = () => useOnboarding((s) => s.setDiscord);
export const useOnboardingReset = () => useOnboarding((s) => s.reset);

export function useOnboardingActions() {
  return {
    setCurrentStep: useOnboardingSetCurrentStep(),
    setOperation: useOnboardingSetOperation(),
    setLocation: useOnboardingSetLocation(),
    setDiscord: useOnboardingSetDiscord(),
    reset: useOnboardingReset(),
  };
}
