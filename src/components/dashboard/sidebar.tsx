"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  MessageCircle,
  BarChart3,
  Zap,
  CreditCard,
  Wrench,
  Brain,
  KeyRound,
  Mail,
  CalendarClock,
  HelpCircle,
  Puzzle,
  BookOpen,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useHelp } from "./help-provider";
import { TrialCountdownBadge } from "./trial-countdown-badge";
import type { SettingsNavItem } from "@/lib/navigation/settings";

interface NavGroup {
  label: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/conversations", label: "Conversations", icon: MessageCircle },
    ],
  },
];

const settingsIconsByHref: Record<string, LucideIcon> = {
  "/settings/channels": MessageSquare,
  "/settings/skills": Zap,
  "/settings/knowledge": BookOpen,
  "/settings/schedules": CalendarClock,
  "/settings/email": Mail,
  "/settings/extensions": Puzzle,
  "/settings/memory": Brain,
  "/settings/mcp-servers": Wrench,
  "/settings/secrets": KeyRound,
  "/settings/ai-model": Settings,
  "/settings/billing": CreditCard,
  "/settings/workflows": Settings,
};

interface SidebarProps {
  settingsItems: SettingsNavItem[];
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
}

export function Sidebar({ settingsItems, subscriptionStatus, trialEndsAt }: SidebarProps) {
  const pathname = usePathname();
  const {
    actions: { openHelp },
  } = useHelp();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen px-4 py-6 hidden md:flex flex-col">
      <div className="flex-1">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display text-xl text-foreground">
            Pantheon
          </span>
        </Link>

        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <h3 className="px-3 mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/40">
              {group.label}
            </h3>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
          </div>
        ))}

        <div className="relative">
          <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <h3 className="px-3 mb-2 pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/40">
            Configure
          </h3>
          <nav className="space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = settingsIconsByHref[item.href] || Settings;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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

      <div className="border-t border-border pt-4 space-y-2">
        {subscriptionStatus === "trialing" && trialEndsAt && (
          <TrialCountdownBadge trialEndsAt={trialEndsAt} />
        )}
        <Link
          href="/usage"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-foreground/60 hover:text-foreground hover:bg-muted"
        >
          <BarChart3 className="w-4 h-4" />
          Usage
        </Link>
        <button
          onClick={openHelp}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-foreground/60 hover:text-foreground hover:bg-muted w-full"
        >
          <HelpCircle className="w-4 h-4" />
          Help
          <kbd className="ml-auto text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground/60">
            ⌘/
          </kbd>
        </button>
      </div>
    </aside>
  );
}
