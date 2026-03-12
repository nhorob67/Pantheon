"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Props {
  enabled: boolean;
  loading: boolean;
  onToggle: (checked: boolean) => void;
  toolkitCount: number;
  connectedCount: number;
}

export function ComposioHeroCard({
  enabled,
  loading,
  onToggle,
  toolkitCount,
  connectedCount,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Subtle glow */}
      {enabled && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="relative px-6 py-5 flex items-start gap-5">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/10 flex items-center justify-center shrink-0">
          <svg
            className="w-7 h-7 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-headline text-lg text-foreground">
              Composio
            </h3>
            <Badge variant={enabled ? "success" : "neutral"}>
              {enabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-foreground/60 text-sm leading-relaxed mb-3">
            Connect your assistant to 800+ third-party services through
            Composio. Enable Google Sheets, Gmail, Calendar, and more — no
            separate account needed.
          </p>
          <div className="flex items-center gap-4 text-xs text-foreground/50">
            <span>{toolkitCount} toolkits available</span>
            {enabled && connectedCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {connectedCount} service{connectedCount !== 1 ? "s" : ""}{" "}
                connected
              </span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div className="shrink-0 pt-1">
          <Switch
            checked={enabled}
            onChange={onToggle}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
