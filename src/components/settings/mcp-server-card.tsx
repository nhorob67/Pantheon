"use client";

import type { McpServerConfig } from "@/types/mcp";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Server, Globe, Terminal, Heart, HeartCrack, HeartOff, HelpCircle } from "lucide-react";
import { useState } from "react";

interface McpServerCardProps {
  server: McpServerConfig;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (server: McpServerConfig) => void;
  onToggle: (server: McpServerConfig, enabled: boolean) => void;
}

const HEALTH_CONFIG = {
  healthy: { icon: Heart, color: "text-green-500", label: "Healthy" },
  degraded: { icon: HeartCrack, color: "text-yellow-500", label: "Degraded" },
  unhealthy: { icon: HeartOff, color: "text-destructive", label: "Unhealthy" },
  unreachable: { icon: HeartOff, color: "text-destructive", label: "Unreachable" },
  unknown: { icon: HelpCircle, color: "text-foreground/30", label: "Not checked" },
} as const;

export function McpServerCard({
  server,
  onEdit,
  onDelete,
  onToggle,
}: McpServerCardProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(server, !server.enabled);
    } finally {
      setToggling(false);
    }
  };

  const health = HEALTH_CONFIG[server.health_status] || HEALTH_CONFIG.unknown;
  const HealthIcon = health.icon;

  const connectionPreview =
    server.transport === "sse"
      ? server.url || "SSE endpoint"
      : [server.command, ...server.args].join(" ");

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Server className="w-4 h-4 text-foreground/60 shrink-0" />
          <h4 className="font-headline text-sm text-foreground truncate">
            {server.display_name}
          </h4>
          <Badge variant={server.transport === "sse" ? "info" : "neutral"}>
            {server.transport === "sse" ? (
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3 h-3" />
                SSE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                stdio
              </span>
            )}
          </Badge>
          <Badge variant={server.scope === "agent" ? "info" : "neutral"}>
            {server.scope}
          </Badge>
          {!server.enabled && (
            <Badge variant="neutral">disabled</Badge>
          )}
          {server.enabled && !server.tools_discovered_at && (
            <Badge variant="info">Pending activation</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {server.enabled && (
            <span title={health.label} className={`p-1.5 ${health.color}`}>
              <HealthIcon className="w-4 h-4" />
            </span>
          )}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              server.enabled ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                server.enabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => onEdit(server)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-foreground/50 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label={`Edit ${server.display_name}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(server)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            aria-label={`Delete ${server.display_name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs font-mono text-foreground/40 truncate flex-1">
          {connectionPreview}
        </p>
        {server.tool_count > 0 && (
          <span className="text-xs text-foreground/40 shrink-0">
            {server.tool_count} tool{server.tool_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {server.enabled && !server.tools_discovered_at && (
        <p className="text-xs text-foreground/40 mt-2">
          Tools will be available on the next agent conversation
        </p>
      )}

      {server.last_error && server.health_status !== "healthy" && (
        <p className="text-xs text-destructive/70 mt-2 truncate">
          {server.last_error}
        </p>
      )}
    </div>
  );
}
