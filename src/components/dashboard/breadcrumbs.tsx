"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  settings: "Settings",
  agents: "Agents",
  conversations: "Conversations",
  usage: "Usage",
  onboarding: "Onboarding",
  "ai-model": "AI Model",
  alerts: "Alerts",
  billing: "Billing",
  channels: "Channels",
  knowledge: "Knowledge",
  memory: "Memory",
  secrets: "Secrets",
  skills: "Skills",
  "mcp-servers": "Tools",
  extensions: "Extensions",
  schedules: "Schedules",
  workflows: "Workflows",
  approvals: "Approvals",
  exports: "Exports",
  activity: "Activity",
  forge: "Skill Forge",
  email: "Email",
  integrations: "Integrations",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-foreground/40 mb-4">
      <Link href="/dashboard" className="hover:text-foreground/60 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3" />
          {crumb.isLast ? (
            <span className="text-foreground/60 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground/60 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
