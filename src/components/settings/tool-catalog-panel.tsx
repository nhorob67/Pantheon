"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Activity,
  Clock,
  Zap,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolEntry {
  id: string;
  tool_key: string;
  display_name: string;
  description: string | null;
  status: "enabled" | "disabled" | "shadow";
  risk_level: "low" | "medium" | "high" | "critical";
  metadata: Record<string, unknown>;
  policy: {
    approval_mode: string;
    allow_roles: string[];
    max_calls_per_hour: number;
    timeout_ms: number;
  } | null;
}

interface GuardrailConfig {
  loop_warning_threshold: number;
  loop_hard_stop_threshold: number;
  max_tool_invocations: number;
  max_elapsed_ms: number;
  max_tokens: number;
  max_spend_cents: number;
}

export interface McpServerHealth {
  server_key: string;
  health_status: string;
  tools_discovered_at: string | null;
}

interface Props {
  tenantId: string;
  tools: ToolEntry[];
  guardrailConfig: GuardrailConfig | null;
  mcpServerHealth?: McpServerHealth[];
}

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

type ToolSource = "native" | "mcp" | "composio" | "extension";

const SOURCE_TABS: { key: ToolSource | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "native", label: "Native" },
  { key: "mcp", label: "MCP" },
  { key: "composio", label: "Composio" },
];

function resolveToolSource(tool: ToolEntry): ToolSource {
  const provider = tool.metadata?.provider as string | undefined;
  if (provider === "mcp") return "mcp";
  if (provider === "composio") return "composio";
  if (provider === "extension") return "extension";
  return "native";
}

const SOURCE_BADGE_CONFIG: Record<ToolSource, { label: string; variant: "neutral" | "info" | "success" }> = {
  native: { label: "Native", variant: "neutral" },
  mcp: { label: "MCP", variant: "info" },
  composio: { label: "Composio", variant: "info" },
  extension: { label: "Extension", variant: "success" },
};

function getConfigureLink(source: ToolSource): string | null {
  switch (source) {
    case "mcp": return "/settings/mcp-servers";
    case "composio": return "/settings/mcp-servers";
    case "extension": return "/settings/extensions";
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_CONFIG: Record<string, { color: string; icon: typeof Shield; label: string }> = {
  low: { color: "text-emerald-400", icon: ShieldCheck, label: "Low" },
  medium: { color: "text-amber-400", icon: Shield, label: "Medium" },
  high: { color: "text-orange-400", icon: ShieldAlert, label: "High" },
  critical: { color: "text-red-400", icon: ShieldOff, label: "Critical" },
};

const CATEGORY_LABELS: Record<string, string> = {
  memory: "Memory",
  schedule: "Schedules",
  "self-config": "Self-Config",
  credentials: "Credentials",
  network: "Network",
  composio: "Composio",
  mcp: "MCP",
  browser: "Browser",
  "internal-control": "Internal",
};

function groupByCategory(tools: ToolEntry[]): Map<string, ToolEntry[]> {
  const groups = new Map<string, ToolEntry[]>();
  for (const tool of tools) {
    const category = (tool.metadata?.category as string) ?? "other";
    const group = groups.get(category) ?? [];
    group.push(tool);
    groups.set(category, group);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolCatalogPanel({ tenantId, tools, guardrailConfig, mcpServerHealth = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ToolSource | "all">("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["memory", "schedule", "self-config", "credentials", "network"])
  );
  const { toast } = useToast();

  // Build MCP server health lookup
  const mcpHealthMap = new Map(
    mcpServerHealth.map((s) => [s.server_key, s])
  );

  // Count tools by source for tab badges
  const sourceCounts = tools.reduce<Record<string, number>>((acc, t) => {
    const src = resolveToolSource(t);
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = tools
    .filter((t) => {
      if (sourceFilter !== "all" && resolveToolSource(t) !== sourceFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.tool_key.toLowerCase().includes(q) ||
        t.display_name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });

  const grouped = groupByCategory(filtered);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleToggle = async (tool: ToolEntry) => {
    const newStatus = tool.status === "enabled" ? "disabled" : "enabled";
    try {
      const res = await fetch(`/api/tenants/${tenantId}/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update tool status");
      toast(`${tool.display_name} ${newStatus}`);
      // Optimistic: caller should refetch
      tool.status = newStatus;
    } catch {
      toast("Failed to update tool", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Source filter tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
        {SOURCE_TABS.map((tab) => {
          const count = tab.key === "all" ? tools.length : (sourceCounts[tab.key] ?? 0);
          const isActive = sourceFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSourceFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/50 hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${isActive ? "text-primary-foreground/70" : "text-foreground/30"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Guardrail Config Summary */}
      {guardrailConfig && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="font-headline text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Run Guardrails
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-foreground/60">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              <span>Max {guardrailConfig.max_tool_invocations} tools/run</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Max {Math.round(guardrailConfig.max_elapsed_ms / 1000)}s/run</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              <span>Loop stop at {guardrailConfig.loop_hard_stop_threshold}x</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Max {(guardrailConfig.max_tokens / 1000).toFixed(0)}k tokens</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Max ${(guardrailConfig.max_spend_cents / 100).toFixed(2)}/run</span>
            </div>
          </div>
        </div>
      )}

      {/* Tool Groups */}
      {Array.from(grouped.entries()).map(([category, categoryTools]) => {
        const isExpanded = expandedCategories.has(category);
        const enabledCount = categoryTools.filter((t) => t.status === "enabled").length;

        return (
          <div key={category} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-foreground/40" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-foreground/40" />
                )}
                <h4 className="font-headline text-sm font-semibold text-foreground">
                  {CATEGORY_LABELS[category] ?? category}
                </h4>
                <Badge variant="neutral">
                  {enabledCount}/{categoryTools.length}
                </Badge>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border divide-y divide-border">
                {categoryTools.map((tool) => {
                  // Resolve MCP server key from tool_key (mcp.{server_key}.{tool_name})
                  const mcpServerKey = tool.tool_key.startsWith("mcp.")
                    ? tool.tool_key.split(".")[1]
                    : undefined;
                  return (
                    <ToolRow
                      key={tool.id}
                      tool={tool}
                      onToggle={handleToggle}
                      mcpHealth={mcpServerKey ? mcpHealthMap.get(mcpServerKey) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-foreground/40">
          {searchQuery ? "No tools match your search." : "No tools registered yet."}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Row
// ---------------------------------------------------------------------------

function ToolRow({
  tool,
  onToggle,
  mcpHealth,
}: {
  tool: ToolEntry;
  onToggle: (tool: ToolEntry) => void;
  mcpHealth?: McpServerHealth;
}) {
  const riskInfo = RISK_CONFIG[tool.risk_level] ?? RISK_CONFIG.low;
  const RiskIcon = riskInfo.icon;
  const source = resolveToolSource(tool);
  const sourceBadge = SOURCE_BADGE_CONFIG[source];
  const configureLink = getConfigureLink(source);

  // MCP health indicator
  const mcpUnhealthy = source === "mcp" && mcpHealth &&
    (mcpHealth.health_status === "unhealthy" || mcpHealth.health_status === "unreachable");
  const mcpAwaitingDiscovery = source === "mcp" && mcpHealth && !mcpHealth.tools_discovered_at;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Wrench className="w-4 h-4 text-foreground/40 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {tool.display_name}
            </span>
            <span className="text-xs font-mono text-foreground/30">
              {tool.tool_key}
            </span>
            {/* Source badge */}
            <Badge variant={sourceBadge.variant}>
              {sourceBadge.label}
            </Badge>
          </div>
          {tool.description && (
            <p className="text-xs text-foreground/50 truncate mt-0.5">
              {tool.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        {/* MCP health indicator */}
        {mcpUnhealthy && (
          <span className="text-xs text-destructive" title="Server unhealthy">
            Unhealthy
          </span>
        )}
        {mcpAwaitingDiscovery && !mcpUnhealthy && (
          <Badge variant="neutral">Awaiting discovery</Badge>
        )}

        {/* Risk badge */}
        <div className={`flex items-center gap-1 ${riskInfo.color}`}>
          <RiskIcon className="w-3.5 h-3.5" />
          <span className="text-xs">{riskInfo.label}</span>
        </div>

        {/* Approval badge */}
        {tool.policy?.approval_mode && tool.policy.approval_mode !== "none" && (
          <Badge variant="info">
            approval: {tool.policy.approval_mode}
          </Badge>
        )}

        {/* Configure link */}
        {configureLink && (
          <Link
            href={configureLink}
            className="text-foreground/30 hover:text-primary transition-colors"
            title={`Configure ${sourceBadge.label} tools`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* Toggle */}
        <Switch
          checked={tool.status === "enabled"}
          onChange={() => onToggle(tool)}
        />
      </div>
    </div>
  );
}
