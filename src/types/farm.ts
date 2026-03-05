export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

export const CA_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const;

export type Country = "US" | "CA";

export type USStateCode = (typeof US_STATES)[number]["code"];
export type CAProvinceCode = (typeof CA_PROVINCES)[number]["code"];

/** @deprecated Use US_STATES / CA_PROVINCES instead */
export const SUPPORTED_STATES = US_STATES.map((s) => s.code);
export type SupportedState = string;

export const BUSINESS_TYPES = [
  "Farm",
  "Ranch",
  "Seed Dealer",
  "Crop Insurance",
  "Consultant",
  "Ag Retailer",
  "Custom Applicator",
  "Other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

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

export const TIMEZONES: Record<string, string> = {
  // US states
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
  // Canadian provinces
  AB: "America/Edmonton",
  BC: "America/Vancouver",
  MB: "America/Winnipeg",
  NB: "America/Moncton",
  NL: "America/St_Johns",
  NS: "America/Halifax",
  NT: "America/Yellowknife",
  NU: "America/Iqaluit",
  ON: "America/Toronto",
  PE: "America/Halifax",
  QC: "America/Toronto",
  SK: "America/Regina",
  YT: "America/Whitehorse",
};

export function getRegions(country: Country) {
  return country === "US" ? US_STATES : CA_PROVINCES;
}

export function getRegionName(code: string, country: Country): string {
  const regions = getRegions(country);
  return regions.find((r) => r.code === code)?.name ?? code;
}

export interface ElevatorPreset {
  name: string;
  url: string;
  states: string[];
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
