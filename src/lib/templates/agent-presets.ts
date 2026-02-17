import type { PersonalityPreset, BuiltInSkill, AvailableCronJob } from "@/types/agent";

export interface AgentPresetConfig {
  display_name: string;
  personality_preset: PersonalityPreset;
  skills: BuiltInSkill[];
  cron_jobs: Partial<Record<AvailableCronJob, boolean>>;
  is_default: boolean;
}

export interface SuggestedSetup {
  id: string;
  label: string;
  description: string;
  agents: AgentPresetConfig[];
}

export const SUGGESTED_SETUPS: SuggestedSetup[] = [
  {
    id: "two-agent",
    label: "General + Grain",
    description:
      "An all-purpose assistant for daily operations and a specialist for grain markets and elevator bids.",
    agents: [
      {
        display_name: "Farm Assistant",
        personality_preset: "general",
        skills: ["farm-grain-bids", "farm-weather", "farm-scale-tickets"],
        cron_jobs: { "morning-weather": true },
        is_default: true,
      },
      {
        display_name: "Grain Desk",
        personality_preset: "grain",
        skills: ["farm-grain-bids"],
        cron_jobs: { "daily-grain-bids": true },
        is_default: false,
      },
    ],
  },
  {
    id: "three-agent",
    label: "General + Grain + Scale Tickets",
    description:
      "Full coverage: general operations, grain marketing, and a dedicated clerk for logging deliveries.",
    agents: [
      {
        display_name: "Farm Assistant",
        personality_preset: "general",
        skills: ["farm-grain-bids", "farm-weather"],
        cron_jobs: { "morning-weather": true },
        is_default: true,
      },
      {
        display_name: "Grain Desk",
        personality_preset: "grain",
        skills: ["farm-grain-bids"],
        cron_jobs: { "daily-grain-bids": true },
        is_default: false,
      },
      {
        display_name: "Ticket Clerk",
        personality_preset: "scale-tickets",
        skills: ["farm-scale-tickets"],
        cron_jobs: {},
        is_default: false,
      },
    ],
  },
  {
    id: "four-agent",
    label: "Full Team",
    description:
      "Four specialists: general advisor, grain markets, weather & field ops, and scale ticket logging.",
    agents: [
      {
        display_name: "Farm Assistant",
        personality_preset: "general",
        skills: ["farm-grain-bids", "farm-weather", "farm-scale-tickets"],
        cron_jobs: {},
        is_default: true,
      },
      {
        display_name: "Grain Desk",
        personality_preset: "grain",
        skills: ["farm-grain-bids"],
        cron_jobs: { "daily-grain-bids": true },
        is_default: false,
      },
      {
        display_name: "Weather Watch",
        personality_preset: "weather",
        skills: ["farm-weather"],
        cron_jobs: { "morning-weather": true },
        is_default: false,
      },
      {
        display_name: "Ticket Clerk",
        personality_preset: "scale-tickets",
        skills: ["farm-scale-tickets"],
        cron_jobs: {},
        is_default: false,
      },
    ],
  },
];
