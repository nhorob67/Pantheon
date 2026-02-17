import type { ComposioToolkit } from "@/types/composio";

export const COMPOSIO_TOOLKITS: ComposioToolkit[] = [
  {
    id: "googlesheets",
    name: "Google Sheets",
    description:
      "Read and write spreadsheets — track field records, expenses, and yields.",
    icon: "sheet",
    category: "recommended",
    requires_auth: true,
    recommended: true,
    actions: [
      "GOOGLESHEETS_READ_SPREADSHEET",
      "GOOGLESHEETS_WRITE_SPREADSHEET",
      "GOOGLESHEETS_CREATE_SPREADSHEET",
    ],
  },
  {
    id: "googlecalendar",
    name: "Google Calendar",
    description:
      "Manage schedules — planting windows, spray timing, and equipment bookings.",
    icon: "calendar",
    category: "recommended",
    requires_auth: true,
    recommended: true,
    actions: [
      "GOOGLECALENDAR_CREATE_EVENT",
      "GOOGLECALENDAR_LIST_EVENTS",
      "GOOGLECALENDAR_UPDATE_EVENT",
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Send and read emails — forward grain contracts, share field reports.",
    icon: "mail",
    category: "recommended",
    requires_auth: true,
    recommended: true,
    actions: [
      "GMAIL_SEND_EMAIL",
      "GMAIL_LIST_EMAILS",
      "GMAIL_READ_EMAIL",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Organize farm knowledge — SOPs, crop plans, and seasonal notes.",
    icon: "file-text",
    category: "productivity",
    requires_auth: true,
    recommended: false,
    actions: [
      "NOTION_CREATE_PAGE",
      "NOTION_SEARCH",
      "NOTION_UPDATE_PAGE",
    ],
  },
  {
    id: "airtable",
    name: "Airtable",
    description:
      "Structured data management — equipment inventory, seed lots, input tracking.",
    icon: "table",
    category: "data",
    requires_auth: true,
    recommended: false,
    actions: [
      "AIRTABLE_CREATE_RECORD",
      "AIRTABLE_LIST_RECORDS",
      "AIRTABLE_UPDATE_RECORD",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Cross-post updates — share weather alerts and market reports to Slack channels.",
    icon: "message-square",
    category: "communication",
    requires_auth: true,
    recommended: true,
    actions: [
      "SLACK_SEND_MESSAGE",
      "SLACK_LIST_CHANNELS",
    ],
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description:
      "Access and organize documents — store field maps, contracts, and reports.",
    icon: "hard-drive",
    category: "productivity",
    requires_auth: true,
    recommended: false,
    actions: [
      "GOOGLEDRIVE_LIST_FILES",
      "GOOGLEDRIVE_UPLOAD_FILE",
      "GOOGLEDRIVE_DOWNLOAD_FILE",
    ],
  },
  {
    id: "todoist",
    name: "Todoist",
    description:
      "Task management — track to-dos for maintenance, fieldwork, and deliveries.",
    icon: "check-square",
    category: "productivity",
    requires_auth: true,
    recommended: false,
    actions: [
      "TODOIST_CREATE_TASK",
      "TODOIST_LIST_TASKS",
      "TODOIST_COMPLETE_TASK",
    ],
  },
];

export const TOOLKIT_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "recommended", label: "Recommended" },
  { id: "productivity", label: "Productivity" },
  { id: "communication", label: "Communication" },
  { id: "data", label: "Data" },
] as const;

export type ToolkitCategory = (typeof TOOLKIT_CATEGORIES)[number]["id"];

export function getToolkitsByCategory(
  category: ToolkitCategory
): ComposioToolkit[] {
  if (category === "all") return COMPOSIO_TOOLKITS;
  if (category === "recommended")
    return COMPOSIO_TOOLKITS.filter((t) => t.recommended);
  return COMPOSIO_TOOLKITS.filter((t) => t.category === category);
}

export function getToolkitById(id: string): ComposioToolkit | undefined {
  return COMPOSIO_TOOLKITS.find((t) => t.id === id);
}
