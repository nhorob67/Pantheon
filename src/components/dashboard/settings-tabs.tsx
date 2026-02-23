"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SettingsNavItem } from "@/lib/navigation/settings";

interface SettingsTabsProps {
  tabs: SettingsNavItem[];
}

export function SettingsTabs({ tabs }: SettingsTabsProps) {
  const pathname = usePathname();
  const hasEmailTab = tabs.some((tab) => tab.href === "/settings/email");
  const settingsTabs =
    pathname.startsWith("/settings/email") && !hasEmailTab
      ? [...tabs, { href: "/settings/email", label: "Email (Optional)" }]
      : tabs;

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
