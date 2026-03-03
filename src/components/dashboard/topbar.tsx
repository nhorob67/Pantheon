"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu, HelpCircle } from "lucide-react";
import { AlertBell } from "@/components/dashboard/alert-bell";
import { useHelp } from "./help-provider";

interface TopbarProps {
  farmName?: string;
  email?: string;
  activeTenantId?: string | null;
  tenantOptions?: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
  }>;
}

export function Topbar({
  farmName,
  email,
  activeTenantId,
  tenantOptions = [],
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const router = useRouter();
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
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-foreground/60">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-headline text-lg font-semibold text-foreground">
            {farmName || "My Farm"}
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
              Workspace: {activeTenantName}
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
          <div className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg py-2 w-48 z-50">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/60 hover:text-foreground hover:bg-muted w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
