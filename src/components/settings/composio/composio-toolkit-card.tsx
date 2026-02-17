"use client";

import React from "react";
import type { ComposioToolkit } from "@/types/composio";
import { ToolkitIcon } from "./toolkit-icon";

interface Props {
  toolkit: ComposioToolkit;
  selected: boolean;
  onToggle: () => void;
}

export function ComposioToolkitCard({ toolkit, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "relative rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer",
        selected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/10"
          : "border-border hover:border-foreground/15",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            selected
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground/50",
          ].join(" ")}
        >
          <ToolkitIcon icon={toolkit.icon} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-body text-sm font-medium text-foreground">
              {toolkit.name}
            </span>
            {toolkit.recommended && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-energy/10 text-amber-600">
                Recommended
              </span>
            )}
          </div>
          <p className="text-foreground/50 text-xs leading-relaxed">
            {toolkit.description}
          </p>
        </div>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2.5 right-2.5">
          <svg
            className="w-4 h-4 text-primary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
