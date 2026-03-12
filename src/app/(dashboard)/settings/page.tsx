import Link from "next/link";
import type { Metadata } from "next";
import {
  MessageSquare, Mail, Brain, BookOpen, Database, Cpu,
  Calendar, GitBranch, Server, KeyRound, Puzzle,
  CreditCard, Bell, ShieldCheck, Download,
} from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const settingsCategories = [
  {
    title: "Communication",
    items: [
      { icon: MessageSquare, title: "Channels", description: "Configure Discord channels and agent bindings", href: "/settings/channels" },
      { icon: Mail, title: "Email", description: "Set up email identity and inbound processing", href: "/settings/email" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { icon: Brain, title: "Skills", description: "Create, edit, and manage custom agent skills", href: "/settings/skills" },
      { icon: BookOpen, title: "Knowledge", description: "Upload documents for agent reference", href: "/settings/knowledge" },
      { icon: Database, title: "Memory", description: "Configure agent memory and retention", href: "/settings/memory" },
      { icon: Cpu, title: "AI Model", description: "Model selection and cost management", href: "/settings/ai-model" },
    ],
  },
  {
    title: "Automation",
    items: [
      { icon: Calendar, title: "Schedules", description: "Manage recurring agent tasks and messages", href: "/settings/schedules" },
      { icon: ShieldCheck, title: "Approvals", description: "Review and approve high-risk tool calls", href: "/settings/approvals" },
      { icon: GitBranch, title: "Workflows", description: "Visual workflow builder and automation", href: "/settings/workflows/approvals" },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { icon: Server, title: "MCP Servers", description: "Custom Model Context Protocol servers", href: "/settings/mcp-servers" },
      { icon: KeyRound, title: "Secrets", description: "Encrypted secrets vault for integrations", href: "/settings/secrets" },
      { icon: Puzzle, title: "Extensions", description: "Browse and install platform extensions", href: "/settings/extensions" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: CreditCard, title: "Billing", description: "Subscription, usage, and spending caps", href: "/settings/billing" },
      { icon: Bell, title: "Alerts", description: "Configure alert preferences and thresholds", href: "/settings/alerts" },
      { icon: Download, title: "Exports", description: "Download tenant data bundles and manifests", href: "/settings/exports" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-foreground/60 mt-1">Configure your team&apos;s agents, integrations, and account</p>
      </div>

      {settingsCategories.map((category) => (
        <div key={category.title}>
          <h2 className="font-headline text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">
            {category.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {category.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border-light hover:bg-card-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-headline text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs text-foreground/50 mt-0.5">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
