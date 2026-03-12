"use client";

import type { McpServerConfig } from "@/types/mcp";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Server } from "lucide-react";
import { useState } from "react";

interface McpServerCardProps {
  server: McpServerConfig;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (server: McpServerConfig) => void;
  onToggle: (server: McpServerConfig, enabled: boolean) => void;
}

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

  const commandPreview = [server.command, ...server.args].join(" ");

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Server className="w-4 h-4 text-foreground/60 shrink-0" />
          <h4 className="font-headline text-sm font-semibold text-foreground truncate">
            {server.display_name}
          </h4>
          <Badge variant={server.scope === "agent" ? "info" : "neutral"}>
            {server.scope}
          </Badge>
          {!server.enabled && (
            <Badge variant="neutral">disabled</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`relative w-9 h-5 rounded-full transition-colors ${
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

      <p className="text-xs font-mono text-foreground/40 truncate">
        {commandPreview}
      </p>
    </div>
  );
}
