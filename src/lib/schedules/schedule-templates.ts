export interface ScheduleTemplate {
  key: string;
  display_name: string;
  prompt: string;
  cron_expression: string;
  tools: string[];
}

export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    key: "daily-summary",
    display_name: "Daily Summary",
    prompt:
      "Generate a daily summary of recent activity, key metrics, and anything that needs attention today. Highlight urgent items first.",
    cron_expression: "0 8 * * *",
    tools: [],
  },
  {
    key: "weekly-report",
    display_name: "Weekly Report",
    prompt:
      "Generate a weekly report covering the past 7 days. Include key accomplishments, metrics trends, and priorities for the coming week.",
    cron_expression: "0 17 * * 5",
    tools: [],
  },
  {
    key: "morning-standup",
    display_name: "Morning Standup",
    prompt:
      "Post a morning standup prompt. Summarize what was accomplished yesterday, what's planned for today, and any blockers or items needing attention.",
    cron_expression: "0 9 * * 1-5",
    tools: [],
  },
];
