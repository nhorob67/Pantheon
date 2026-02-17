export type PersonalityPreset = "general" | "grain" | "weather" | "scale-tickets" | "operations" | "custom";

export interface Agent {
  id: string;
  instance_id: string;
  customer_id: string;
  agent_key: string;
  display_name: string;
  personality_preset: PersonalityPreset;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  cron_jobs: Record<string, boolean>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const PERSONALITY_PRESETS = [
  "general",
  "grain",
  "weather",
  "scale-tickets",
  "operations",
  "custom",
] as const;

export const PRESET_INFO: Record<
  PersonalityPreset,
  { label: string; description: string; icon: string; accent: string }
> = {
  general: {
    label: "General Advisor",
    description: "All-purpose farm assistant — weather, markets, and operations",
    icon: "Wheat",
    accent: "text-primary",
  },
  grain: {
    label: "Grain Specialist",
    description: "Cash bids, basis, elevator comparison, and marketing timing",
    icon: "TrendingUp",
    accent: "text-amber-500",
  },
  weather: {
    label: "Weather & Field Ops",
    description: "Forecasts, spray windows, GDD, and field conditions",
    icon: "CloudSun",
    accent: "text-blue-400",
  },
  "scale-tickets": {
    label: "Scale Ticket Clerk",
    description: "Log deliveries via photo, voice, or structured entry",
    icon: "ClipboardList",
    accent: "text-orange-500",
  },
  operations: {
    label: "Field Operations",
    description: "Equipment scheduling, input tracking, and field work planning",
    icon: "Tractor",
    accent: "text-emerald-500",
  },
  custom: {
    label: "Custom",
    description: "Define your own personality and focus area",
    icon: "Pen",
    accent: "text-foreground/60",
  },
};

export const BUILT_IN_SKILLS = [
  "farm-grain-bids",
  "farm-weather",
  "farm-scale-tickets",
] as const;

export type BuiltInSkill = (typeof BUILT_IN_SKILLS)[number];

/** @deprecated Use BUILT_IN_SKILLS */
export const AVAILABLE_SKILLS = BUILT_IN_SKILLS;
/** @deprecated Use BuiltInSkill */
export type AvailableSkill = BuiltInSkill;

export const BUILT_IN_SKILL_SLUGS = new Set<string>(BUILT_IN_SKILLS);

export function isBuiltInSkill(slug: string): slug is BuiltInSkill {
  return BUILT_IN_SKILL_SLUGS.has(slug);
}

export const SKILL_INFO: Record<
  BuiltInSkill,
  { label: string; description: string; icon: string }
> = {
  "farm-grain-bids": {
    label: "Grain Bids",
    description: "Scrapes elevator websites for cash grain prices",
    icon: "BarChart3",
  },
  "farm-weather": {
    label: "Weather",
    description: "NWS forecasts, spray windows, and GDD calculations",
    icon: "CloudSun",
  },
  "farm-scale-tickets": {
    label: "Scale Tickets",
    description: "Log grain deliveries via photo, voice, or structured entry",
    icon: "ClipboardList",
  },
};

export const AVAILABLE_CRON_JOBS = [
  "morning-weather",
  "daily-grain-bids",
  "weather-alert-check",
  "price-alert-check",
  "ticket-anomaly-check",
] as const;

export type AvailableCronJob = (typeof AVAILABLE_CRON_JOBS)[number];

export const CRON_JOB_INFO: Record<
  AvailableCronJob,
  { label: string; description: string; schedule: string; requiredSkill: BuiltInSkill }
> = {
  "morning-weather": {
    label: "Morning Weather",
    description: "Daily weather briefing at 6:00 AM",
    schedule: "0 6 * * *",
    requiredSkill: "farm-weather",
  },
  "daily-grain-bids": {
    label: "Daily Grain Bids",
    description: "Cash grain bids Mon-Fri at 9:00 AM",
    schedule: "0 9 * * 1-5",
    requiredSkill: "farm-grain-bids",
  },
  "weather-alert-check": {
    label: "Severe Weather Alerts",
    description: "Check for severe weather every 2 hours",
    schedule: "0 */2 * * *",
    requiredSkill: "farm-weather",
  },
  "price-alert-check": {
    label: "Price Movement Alerts",
    description: "Check grain price changes at 9 AM and 2 PM Mon-Fri",
    schedule: "0 9,14 * * 1-5",
    requiredSkill: "farm-grain-bids",
  },
  "ticket-anomaly-check": {
    label: "Scale Ticket Anomalies",
    description: "Check for ticket anomalies at 6 PM Mon-Fri",
    schedule: "0 18 * * 1-5",
    requiredSkill: "farm-scale-tickets",
  },
};

/** Default skills auto-selected for each personality preset */
export const PRESET_DEFAULT_SKILLS: Record<PersonalityPreset, BuiltInSkill[]> = {
  general: ["farm-grain-bids", "farm-weather"],
  grain: ["farm-grain-bids"],
  weather: ["farm-weather"],
  "scale-tickets": ["farm-scale-tickets"],
  operations: [],
  custom: [],
};

/** Default cron jobs auto-selected for each personality preset */
export const PRESET_DEFAULT_CRONS: Record<PersonalityPreset, AvailableCronJob[]> = {
  general: ["morning-weather", "daily-grain-bids"],
  grain: ["daily-grain-bids"],
  weather: ["morning-weather"],
  "scale-tickets": [],
  operations: [],
  custom: [],
};
