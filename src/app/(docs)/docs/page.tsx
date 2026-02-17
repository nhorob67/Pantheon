import type { Metadata } from "next";
import Link from "next/link";
import { buildNavigation } from "@/lib/docs/navigation";
import {
  Rocket,
  Tractor,
  MessageSquare,
  Bot,
  Wrench,
  Server,
  Puzzle,
  CreditCard,
  HelpCircle,
  Link2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to set up and use FarmClaw, the AI assistant for Upper Midwest row crop farmers.",
};

const SECTION_META: Record<
  string,
  { icon: React.ReactNode; description: string }
> = {
  "Getting Started": {
    icon: <Rocket className="w-6 h-6" />,
    description:
      "Create your account, walk through onboarding, and send your first message.",
  },
  "Farm Setup": {
    icon: <Tractor className="w-6 h-6" />,
    description:
      "Configure your farm profile, select crops, and set up elevator connections.",
  },
  "Discord Integration": {
    icon: <MessageSquare className="w-6 h-6" />,
    description:
      "Connect your Discord server, configure channels, and manage bot permissions.",
  },
  "AI Agents": {
    icon: <Bot className="w-6 h-6" />,
    description:
      "Set up multiple agents with personality presets, skills, and channel bindings.",
  },
  Tools: {
    icon: <Wrench className="w-6 h-6" />,
    description:
      "Review the built-in tool inventory and where each tool fits in daily operations.",
  },
  Skills: {
    icon: <Wrench className="w-6 h-6" />,
    description:
      "Enable grain bids, weather forecasts, scale ticket management, and more.",
  },
  "MCP Servers": {
    icon: <Server className="w-6 h-6" />,
    description:
      "Add Model Context Protocol servers for filesystem, database, and memory access.",
  },
  Integrations: {
    icon: <Link2 className="w-6 h-6" />,
    description:
      "Connect your assistant to Google Sheets, Gmail, Calendar, and 800+ services via Composio.",
  },
  Extensions: {
    icon: <Puzzle className="w-6 h-6" />,
    description:
      "Browse the marketplace, install extensions, and manage trust policies.",
  },
  "Billing & Usage": {
    icon: <CreditCard className="w-6 h-6" />,
    description:
      "Manage your subscription, understand metered usage, and view cost breakdowns.",
  },
  Troubleshooting: {
    icon: <HelpCircle className="w-6 h-6" />,
    description:
      "Common issues, FAQ, and solutions for getting things working smoothly.",
  },
};

export default function DocsPage() {
  const navigation = buildNavigation();

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 lg:px-8">
      <div className="mb-16">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--headline)" }}
        >
          FarmClaw Documentation
        </h1>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl leading-relaxed">
          Everything you need to set up and get the most out of your AI farm
          assistant. From first login to advanced multi-agent configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {navigation.map((section) => {
          const meta = SECTION_META[section.title];
          const firstItem = section.items[0];
          if (!firstItem) return null;

          return (
            <Link
              key={section.title}
              href={`/docs/${firstItem.slug}`}
              className="group block bg-bg-card border border-border rounded-xl p-6 transition-all hover:border-accent/30 hover:bg-bg-card-hover"
            >
              <div className="flex items-start gap-4">
                <div className="text-text-dim group-hover:text-accent transition-colors mt-0.5">
                  {meta?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {section.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-text-dim leading-relaxed">
                    {meta?.description}
                  </p>
                  <span className="mt-3 inline-block text-xs text-text-dim">
                    {section.items.length}{" "}
                    {section.items.length === 1 ? "article" : "articles"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
