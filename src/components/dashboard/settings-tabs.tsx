"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SettingsTabsProps {
  workflowBuilderEnabled: boolean;
}

interface SettingsTab {
  href: string;
  label: string;
}

function buildBaseSettingsTabs(workflowBuilderEnabled: boolean): SettingsTab[] {
  const tabs: SettingsTab[] = [
    { href: "/settings/farm", label: "Farm Profile" },
    { href: "/settings/channels", label: "Channels" },
    { href: "/settings/skills", label: "Skills" },
    { href: "/settings/memory", label: "Memory" },
    { href: "/settings/knowledge", label: "Knowledge" },
    { href: "/settings/extensions", label: "Extensions" },
    { href: "/settings/mcp-servers", label: "Tools" },
    { href: "/settings/integrations", label: "Integrations" },
    { href: "/settings/billing", label: "Billing" },
  ];

  if (workflowBuilderEnabled) {
    tabs.splice(2, 0, { href: "/settings/workflows", label: "Workflows" });
  }

  return tabs;
}

export function SettingsTabs({ workflowBuilderEnabled }: SettingsTabsProps) {
  const pathname = usePathname();
  const baseSettingsTabs = buildBaseSettingsTabs(workflowBuilderEnabled);
  const settingsTabs = pathname.startsWith("/settings/email")
    ? [...baseSettingsTabs, { href: "/settings/email", label: "Email (Optional)" }]
    : baseSettingsTabs;

  return (
    <div className="bg-muted rounded-full p-1 inline-flex mb-8">
      {settingsTabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              active
                ? "bg-card shadow-sm font-semibold text-foreground"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
