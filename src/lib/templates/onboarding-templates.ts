import type { SupportedState } from "@/types/farm";
import type { Step1Data, Step2Data, Step3Data } from "@/lib/validators/onboarding";
import { TIMEZONES, ELEVATOR_PRESETS } from "@/types/farm";

interface StateDefaults {
  weather_location: string;
  weather_lat: number;
  weather_lng: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  defaultCrops: string[];
  applicableStates: SupportedState[];
  agentSetup: "two-agent" | "three-agent" | "four-agent";
  stateDefaults: Partial<Record<SupportedState, StateDefaults>>;
}

export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: "corn-soybean",
    name: "Corn & Soybean Farm",
    tagline: "Optimized for corn-soy rotations in the heart of the Midwest",
    icon: "Sprout",
    defaultCrops: ["Corn", "Soybeans"],
    applicableStates: ["IA", "NE", "MN", "SD"],
    agentSetup: "three-agent",
    stateDefaults: {
      IA: { weather_location: "Des Moines, IA", weather_lat: 41.5868, weather_lng: -93.625 },
      NE: { weather_location: "Lincoln, NE", weather_lat: 40.8136, weather_lng: -96.7026 },
      MN: { weather_location: "Mankato, MN", weather_lat: 44.1636, weather_lng: -93.9994 },
      SD: { weather_location: "Sioux Falls, SD", weather_lat: 43.5446, weather_lng: -96.7311 },
    },
  },
  {
    id: "spring-wheat-durum",
    name: "Spring Wheat & Durum",
    tagline: "Built for the Northern Plains wheat belt",
    icon: "Wheat",
    defaultCrops: ["Spring Wheat", "Durum"],
    applicableStates: ["ND", "MT"],
    agentSetup: "two-agent",
    stateDefaults: {
      ND: { weather_location: "Fargo, ND", weather_lat: 46.8772, weather_lng: -96.7898 },
      MT: { weather_location: "Great Falls, MT", weather_lat: 47.5002, weather_lng: -111.3008 },
    },
  },
  {
    id: "diversified",
    name: "Diversified Row Crop",
    tagline: "Multiple crops, full coverage across operations",
    icon: "LayoutGrid",
    defaultCrops: ["Corn", "Soybeans", "Spring Wheat"],
    applicableStates: ["ND", "SD", "MN", "MT", "IA", "NE"],
    agentSetup: "four-agent",
    stateDefaults: {
      ND: { weather_location: "Fargo, ND", weather_lat: 46.8772, weather_lng: -96.7898 },
      SD: { weather_location: "Sioux Falls, SD", weather_lat: 43.5446, weather_lng: -96.7311 },
      MN: { weather_location: "Mankato, MN", weather_lat: 44.1636, weather_lng: -93.9994 },
      MT: { weather_location: "Great Falls, MT", weather_lat: 47.5002, weather_lng: -111.3008 },
      IA: { weather_location: "Des Moines, IA", weather_lat: 41.5868, weather_lng: -93.625 },
      NE: { weather_location: "Lincoln, NE", weather_lat: 40.8136, weather_lng: -96.7026 },
    },
  },
  {
    id: "small-grain",
    name: "Small Grain Specialist",
    tagline: "Barley, wheat, and specialty crops for the northern tier",
    icon: "Tractor",
    defaultCrops: ["Barley", "Spring Wheat", "Canola"],
    applicableStates: ["ND", "MT", "SD"],
    agentSetup: "two-agent",
    stateDefaults: {
      ND: { weather_location: "Minot, ND", weather_lat: 48.2325, weather_lng: -101.2963 },
      MT: { weather_location: "Havre, MT", weather_lat: 48.5500, weather_lng: -109.6841 },
      SD: { weather_location: "Aberdeen, SD", weather_lat: 45.4647, weather_lng: -98.4865 },
    },
  },
];

export function getTemplateDefaults(
  templateId: string,
  state: SupportedState
): { step1: Partial<Step1Data>; step2: Partial<Step2Data>; step3: Partial<Step3Data> } | null {
  const template = ONBOARDING_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const stateDefault = template.stateDefaults[state];
  if (!stateDefault) return null;

  // Find elevators applicable to this state
  const elevators = ELEVATOR_PRESETS
    .filter((e) => e.states.includes(state))
    .slice(0, 3)
    .map((e) => ({ name: e.name, url: e.url, crops: template.defaultCrops }));

  return {
    step1: {
      farm_name: "",
      state,
      county: "",
      primary_crops: template.defaultCrops as Step1Data["primary_crops"],
      acres: undefined,
    },
    step2: {
      elevators,
    },
    step3: {
      weather_location: stateDefault.weather_location,
      weather_lat: stateDefault.weather_lat,
      weather_lng: stateDefault.weather_lng,
      timezone: TIMEZONES[state],
    },
  };
}
