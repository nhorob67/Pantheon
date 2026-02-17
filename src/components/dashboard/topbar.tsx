"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu, HelpCircle } from "lucide-react";
import { AlertBell } from "@/components/dashboard/alert-bell";
import { useHelp } from "./help-provider";

interface TopbarProps {
  farmName?: string;
  instanceStatus?: string;
  email?: string;
}

export function Topbar({ farmName, instanceStatus, email }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { openHelp } = useHelp();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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
        {instanceStatus && (
          <span
            className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full ${
              instanceStatus === "running"
                ? "bg-primary/10 text-primary"
                : instanceStatus === "stopped"
                  ? "bg-energy/10 text-amber-700"
                  : instanceStatus === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground/60"
            }`}
          >
            {instanceStatus}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
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
