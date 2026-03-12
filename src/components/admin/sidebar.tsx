"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/usage", label: "Usage & Revenue", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen px-4 py-6 hidden md:block">
      <Link href="/admin" className="flex items-center gap-2 px-3 mb-2">
        <span className="font-display text-xl text-foreground">
          Pantheon
        </span>
        <span className="text-xs font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
          Admin
        </span>
      </Link>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 mb-8 text-xs text-foreground/60 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
