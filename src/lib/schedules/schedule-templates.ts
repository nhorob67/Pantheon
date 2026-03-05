export interface ScheduleTemplate {
  key: string;
  display_name: string;
  prompt: string;
  cron_expression: string;
  tools: string[];
}

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    key: "morning-field-check",
    display_name: "Morning Field Check",
    prompt:
      "Generate a morning field conditions report. Include today's weather forecast, current soil conditions estimate based on recent precipitation, and any alerts that affect field operations. Highlight spray windows if available.",
    cron_expression: "0 6 * * *",
    tools: ["farm-weather"],
  },
  {
    key: "weekly-market-summary",
    display_name: "Weekly Market Summary",
    prompt:
      "Generate a weekly grain market summary. Show current cash bids from all configured elevators, compare this week's basis to last week, highlight the best bids, and note any significant market moves. Include a brief outlook.",
    cron_expression: "0 17 * * 5",
    tools: ["farm-grain-bids"],
  },
  {
    key: "harvest-progress",
    display_name: "Harvest Progress Check",
    prompt:
      "Generate an end-of-day harvest progress report. Summarize today's scale ticket activity — total loads, bushels by crop, and which elevators received deliveries. Flag any tickets with unusual moisture or test weight readings.",
    cron_expression: "0 20 * * 1-6",
    tools: ["farm-scale-tickets"],
  },
  {
    key: "planting-countdown",
    display_name: "Planting Season Countdown",
    prompt:
      "Generate a planting season readiness report. Check the 5-day forecast for field-work windows, current accumulated GDD, frost risk, and soil temperature estimates. Recommend whether conditions favor planting this week.",
    cron_expression: "0 7 * * *",
    tools: ["farm-weather"],
  },
];
