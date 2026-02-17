"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu } from "lucide-react";

interface AdminTopbarProps {
  email?: string;
}

export function AdminTopbar({ email }: AdminTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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
        <h1 className="font-headline text-lg font-semibold text-foreground">
          Admin Panel
        </h1>
      </div>

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
    </header>
  );
}
