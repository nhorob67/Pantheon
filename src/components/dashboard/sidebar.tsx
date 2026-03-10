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
  KeyRound,
  Mail,
  MessageCircle,
  Sun,
  Activity,
  CalendarClock,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { useHelp } from "./help-provider";
import { TrialCountdownBadge } from "./trial-countdown-badge";
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
  "/settings/heartbeat": HeartPulse,
  "/settings/activity": Activity,
  "/settings/memory": Brain,
  "/settings/exports": Download,
  "/settings/mcp-servers": Wrench,
  "/settings/secrets": KeyRound,
  "/settings/alerts": Bell,
  "/settings/billing": CreditCard,
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
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
          <Wheat className="w-5 h-5 text-energy" />
          <span className="font-display text-xl font-bold text-foreground">
            Farm<span className="text-energy">Claw</span>
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
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2 ${
                  active
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-transparent text-foreground/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 relative">
          <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <h3 className="px-3 mb-2 pt-4 font-headline text-xs font-semibold uppercase tracking-wider text-foreground/60">
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
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2 ${
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-transparent text-foreground/60 hover:text-foreground hover:bg-muted"
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
        <button
          onClick={openHelp}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-foreground/60 hover:text-foreground hover:bg-muted w-full"
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
