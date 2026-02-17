export const SUPPORTED_STATES = [
  "ND",
  "SD",
  "MN",
  "MT",
  "IA",
  "NE",
] as const;

export type SupportedState = (typeof SUPPORTED_STATES)[number];

export const CROPS = [
  "Corn",
  "Soybeans",
  "Spring Wheat",
  "Winter Wheat",
  "Durum",
  "Sunflowers",
  "Canola",
  "Barley",
  "Dry Beans",
] as const;

export type Crop = (typeof CROPS)[number];

export const CHANNEL_TYPES = ["discord"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const TIMEZONES: Record<SupportedState, string> = {
  ND: "America/Chicago",
  SD: "America/Chicago",
  MN: "America/Chicago",
  MT: "America/Denver",
  IA: "America/Chicago",
  NE: "America/Chicago",
};

export interface ElevatorPreset {
  name: string;
  url: string;
  states: SupportedState[];
}

export const ELEVATOR_PRESETS: ElevatorPreset[] = [
  {
    name: "CHS - Fargo",
    url: "https://www.chsinc.com/grain-marketing/cash-bids",
    states: ["ND", "MN"],
  },
  {
    name: "CHS - Sioux Falls",
    url: "https://www.chsinc.com/grain-marketing/cash-bids",
    states: ["SD"],
  },
  {
    name: "ADM - Casselton",
    url: "https://www.adm.com/offerings/grain",
    states: ["ND"],
  },
  {
    name: "Cargill - Minneapolis",
    url: "https://www.cargill.com/grain-markets",
    states: ["MN"],
  },
  {
    name: "AGP - Omaha",
    url: "https://www.agp.com/grain-marketing",
    states: ["NE", "IA"],
  },
  {
    name: "Columbia Grain - Great Falls",
    url: "https://www.columbiagrain.com/cash-bids",
    states: ["MT"],
  },
  {
    name: "Gavilon - Des Moines",
    url: "https://www.gavilon.com/grain",
    states: ["IA", "NE"],
  },
];
