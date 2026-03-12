"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  Menu,
  HelpCircle,
  X,
  LayoutDashboard,
  Bot,
  MessageCircle,
  Zap,
  Brain,
  Wrench,
  CreditCard,
  KeyRound,
  Mail,
  CalendarClock,
  MessageSquare,
  Puzzle,
  BookOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { AlertBell } from "@/components/dashboard/alert-bell";
import { useHelp } from "./help-provider";
import { Sheet } from "@/components/ui/sheet";
import type { SettingsNavItem } from "@/lib/navigation/settings";

const EMPTY_TENANT_OPTIONS: Array<{ id: string; name: string; slug: string; status: string }> = [];
const EMPTY_SETTINGS_ITEMS: SettingsNavItem[] = [];

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessageCircle },
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

interface TopbarProps {
  teamName?: string;
  email?: string;
  activeTenantId?: string | null;
  tenantOptions?: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
  }>;
  settingsItems?: SettingsNavItem[];
}

export function Topbar({
  teamName,
  email,
  activeTenantId,
  tenantOptions = EMPTY_TENANT_OPTIONS,
  settingsItems = EMPTY_SETTINGS_ITEMS,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const {
    actions: { openHelp },
  } = useHelp();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTenantChange = async (tenantId: string) => {
    if (!tenantId || tenantId === activeTenantId) {
      return;
    }

    setSwitchingTenant(true);
    try {
      await fetch("/api/tenants/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      router.refresh();
    } finally {
      setSwitchingTenant(false);
    }
  };

  const showTenantSwitcher = tenantOptions.length > 1;
  const activeTenantName =
    tenantOptions.find((tenant) => tenant.id === activeTenantId)?.name
    || tenantOptions[0]?.name
    || null;

  return (
    <>
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-foreground/60 hover:text-foreground transition-colors"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-headline text-lg font-semibold text-foreground">
              {teamName || "My Team"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showTenantSwitcher ? (
            <label className="hidden md:flex items-center gap-2 text-xs text-foreground/60">
              Workspace
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                value={activeTenantId || tenantOptions[0]?.id || ""}
                onChange={(event) => {
                  void handleTenantChange(event.target.value);
                }}
                disabled={switchingTenant}
              >
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            activeTenantName && (
              <span className="hidden md:inline-flex text-xs rounded-full border border-border px-2 py-1 text-foreground/60">
                {activeTenantName}
              </span>
            )
          )}
          <button
            onClick={openHelp}
            className="md:hidden text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <AlertBell />
          <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{email}</span>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg py-2 w-48 z-50"
                role="menu"
              >
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/60 hover:text-foreground hover:bg-muted w-full text-left"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <Sheet open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} side="left">
        <div className="px-4 py-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">Pantheon</span>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="text-foreground/60 hover:text-foreground transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={active ? "page" : undefined}
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

          <div className="mt-6">
            <h3 className="px-3 mb-2 font-headline text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
              Configure
            </h3>
            <nav className="space-y-0.5">
              {settingsItems.map((item) => {
                const Icon = settingsIconsByHref[item.href] || Settings;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    aria-current={active ? "page" : undefined}
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
      </Sheet>
    </>
  );
}
