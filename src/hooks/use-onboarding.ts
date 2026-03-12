"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OnboardingState {
  currentStep: number;
  team: Partial<{
    team_name: string;
    team_goal: string;
    timezone: string;
  }>;
  agent: Partial<{
    display_name: string;
    role: string;
    goal: string;
    backstory: string;
    autonomy_level: "assisted" | "copilot" | "autopilot";
  }>;
  discord: Partial<{
    discord_guild_id: string;
    skipped: boolean;
  }>;
  setCurrentStep: (step: number) => void;
  setTeam: (data: Partial<OnboardingState["team"]>) => void;
  setAgent: (data: Partial<OnboardingState["agent"]>) => void;
  setDiscord: (data: Partial<OnboardingState["discord"]>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  team: {},
  agent: { autonomy_level: "copilot" as const },
  discord: {},
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentStep: (step) => set({ currentStep: step }),
      setTeam: (data) =>
        set((s) => ({ team: { ...s.team, ...data } })),
      setAgent: (data) =>
        set((s) => ({ agent: { ...s.agent, ...data } })),
      setDiscord: (data) =>
        set((s) => ({ discord: { ...s.discord, ...data } })),
      reset: () => set(initialState),
    }),
    {
      name: "pantheon-onboarding-v4",
      storage: createJSONStorage(() => sessionStorage),
      version: 4,
      partialize: (state) => ({
        currentStep: state.currentStep,
        team: state.team,
        agent: state.agent,
        // discord excluded from persistence (sensitive)
      }),
    }
  )
);

// Granular selectors — subscribe to minimal state
export const useOnboardingStep = () => useOnboarding((s) => s.currentStep);
export const useOnboardingTeam = () => useOnboarding((s) => s.team);
export const useOnboardingAgent = () => useOnboarding((s) => s.agent);
export const useOnboardingDiscord = () => useOnboarding((s) => s.discord);
export const useOnboardingSetCurrentStep = () =>
  useOnboarding((s) => s.setCurrentStep);
export const useOnboardingSetTeam = () => useOnboarding((s) => s.setTeam);
export const useOnboardingSetAgent = () => useOnboarding((s) => s.setAgent);
export const useOnboardingSetDiscord = () => useOnboarding((s) => s.setDiscord);
export const useOnboardingReset = () => useOnboarding((s) => s.reset);

export function useOnboardingActions() {
  return {
    setCurrentStep: useOnboardingSetCurrentStep(),
    setTeam: useOnboardingSetTeam(),
    setAgent: useOnboardingSetAgent(),
    setDiscord: useOnboardingSetDiscord(),
    reset: useOnboardingReset(),
  };
}
