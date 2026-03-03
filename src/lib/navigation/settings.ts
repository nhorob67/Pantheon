export interface SettingsNavItem {
  href: string;
  label: string;
}

const WORKFLOW_SETTINGS_ITEM: SettingsNavItem = {
  href: "/settings/workflows",
  label: "Workflows (Legacy Builder)",
};

const SETTINGS_TABS_BASE: SettingsNavItem[] = [
  { href: "/settings/farm", label: "Farm Profile" },
  { href: "/settings/channels", label: "Channels" },
  { href: "/settings/skills", label: "Skills" },
  { href: "/settings/briefings", label: "Briefings" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/approvals", label: "Approvals" },
  { href: "/settings/knowledge", label: "Knowledge" },
  { href: "/settings/extensions", label: "Extensions" },
  { href: "/settings/exports", label: "Exports" },
  { href: "/settings/mcp-servers", label: "Tools" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/billing", label: "Billing" },
];

const SIDEBAR_SETTINGS_BASE: SettingsNavItem[] = [
  { href: "/settings/farm", label: "Farm Profile" },
  { href: "/settings/channels", label: "Channels" },
  { href: "/settings/skills", label: "Skills" },
  { href: "/settings/briefings", label: "Briefings" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/approvals", label: "Approvals" },
  { href: "/settings/exports", label: "Exports" },
  { href: "/settings/mcp-servers", label: "Tools" },
  { href: "/settings/alerts", label: "Alerts" },
  { href: "/settings/billing", label: "Billing" },
];

function withOptionalWorkflowItem(
  items: SettingsNavItem[],
  workflowBuilderEnabled: boolean
): SettingsNavItem[] {
  if (!workflowBuilderEnabled) {
    return [...items];
  }

  const withWorkflow = [...items, WORKFLOW_SETTINGS_ITEM];
  return withWorkflow;
}

export function buildSettingsTabs(workflowBuilderEnabled: boolean): SettingsNavItem[] {
  return withOptionalWorkflowItem(SETTINGS_TABS_BASE, workflowBuilderEnabled);
}

export function buildSidebarSettingsItems(workflowBuilderEnabled: boolean): SettingsNavItem[] {
  return withOptionalWorkflowItem(SIDEBAR_SETTINGS_BASE, workflowBuilderEnabled);
}
