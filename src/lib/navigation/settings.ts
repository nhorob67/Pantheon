export interface SettingsNavItem {
  href: string;
  label: string;
}

const WORKFLOW_SETTINGS_ITEM: SettingsNavItem = {
  href: "/settings/workflows",
  label: "Workflows (Legacy Builder)",
};

const SETTINGS_TABS_BASE: SettingsNavItem[] = [
  { href: "/settings/channels", label: "Discord" },
  { href: "/settings/skills", label: "Skills" },
  { href: "/settings/knowledge", label: "Knowledge" },
  { href: "/settings/schedules", label: "Schedules" },
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/approvals", label: "Approvals" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/extensions", label: "Integrations" },
  { href: "/settings/mcp-servers", label: "Tools" },
  { href: "/settings/secrets", label: "Secrets Vault" },
  { href: "/settings/ai-model", label: "AI Model" },
  { href: "/settings/billing", label: "Billing" },
];

const SIDEBAR_NAV_ITEMS: SettingsNavItem[] = [
  // TEAM
  { href: "/settings/skills", label: "Skills" },
  { href: "/settings/knowledge", label: "Knowledge" },
  { href: "/settings/schedules", label: "Schedules" },
  // CONNECT
  { href: "/settings/channels", label: "Discord" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/extensions", label: "Integrations" },
  // CONFIGURE
  { href: "/settings/memory", label: "Memory" },
  { href: "/settings/mcp-servers", label: "Tools" },
  { href: "/settings/secrets", label: "Secrets" },
  { href: "/settings/ai-model", label: "AI Model" },
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
  return withOptionalWorkflowItem(SIDEBAR_NAV_ITEMS, workflowBuilderEnabled);
}
