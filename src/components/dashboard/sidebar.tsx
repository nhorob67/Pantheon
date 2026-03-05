"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  Wheat,
  Users,
  Zap,
  CreditCard,
  Wrench,
  Brain,
  Bell,
  GitBranch,
  Download,
  HelpCircle,
  Mail,
  MessageCircle,
  Sun,
  Activity,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { useHelp } from "./help-provider";
import type { SettingsNavItem } from "@/lib/navigation/settings";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversations", label: "Conversations", icon: MessageCircle },
  { href: "/email", label: "Email", icon: Mail },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const settingsIconsByHref: Record<string, LucideIcon> = {
  "/settings/farm": Wheat,
  "/settings/channels": Users,
  "/settings/workflows": GitBranch,
  "/settings/skills": Zap,
  "/settings/briefings": Sun,
  "/settings/schedules": CalendarClock,
  "/settings/activity": Activity,
  "/settings/memory": Brain,
  "/settings/exports": Download,
  "/settings/mcp-servers": Wrench,
  "/settings/alerts": Bell,
  "/settings/billing": CreditCard,
};

interface SidebarProps {
  settingsItems: SettingsNavItem[];
}

export function Sidebar({ settingsItems }: SidebarProps) {
  const pathname = usePathname();
  const {
    actions: { openHelp },
  } = useHelp();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen px-4 py-6 hidden md:flex flex-col">
      <div className="flex-1">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
          <span className="font-display text-xl font-bold text-foreground">
            FarmClaw
          </span>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <h3 className="px-3 mb-2 font-headline text-xs font-semibold uppercase tracking-wider text-foreground/40">
            <Settings className="w-3 h-3 inline mr-1.5" />
            Settings
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = settingsIconsByHref[item.href] || Settings;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/60 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={openHelp}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-foreground/60 hover:text-foreground hover:bg-muted w-full"
        >
          <HelpCircle className="w-4 h-4" />
          Help
          <kbd className="ml-auto text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground/40">
            ⌘/
          </kbd>
        </button>
      </div>
    </aside>
  );
}
