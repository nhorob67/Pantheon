"use client";

import React from "react";

interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div
      className={`bg-muted rounded-full p-1 inline-flex ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;

        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={[
              "px-4 py-2 rounded-full font-body text-sm transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-card shadow-sm font-semibold text-foreground"
                : "text-foreground/50 hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type TabsProps, type Tab };
