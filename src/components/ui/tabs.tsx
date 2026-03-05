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
      className={`flex gap-1 overflow-x-auto scrollbar-hide border-b border-border-light ${className}`}
      role="tablist"
      style={{ scrollbarWidth: "none" }}
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
            className={`relative shrink-0 px-3 pb-2.5 pt-1 text-[13px] tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
              isActive
                ? "text-accent-light font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type TabsProps, type Tab };
