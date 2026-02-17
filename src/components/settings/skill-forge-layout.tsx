"use client";

import { useState, type ReactNode } from "react";

interface SkillForgeLayoutProps {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}

export function SkillForgeLayout({
  left,
  right,
  leftLabel = "Editor",
  rightLabel = "Preview",
}: SkillForgeLayoutProps) {
  const [activeTab, setActiveTab] = useState<"left" | "right">("left");

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 min-h-[600px]">
        <div className="min-w-0 overflow-hidden">{left}</div>
        <div className="min-w-0 overflow-hidden">{right}</div>
      </div>

      {/* Mobile: tabbed */}
      <div className="lg:hidden">
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("left")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "left"
                ? "text-accent border-b-2 border-accent"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            {leftLabel}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("right")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "right"
                ? "text-accent border-b-2 border-accent"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            {rightLabel}
          </button>
        </div>

        {activeTab === "left" ? left : right}
      </div>
    </>
  );
}
