"use client";

import React, { useState, useMemo } from "react";
import { COMPOSIO_TOOLKITS, TOOLKIT_CATEGORIES, type ToolkitCategory } from "@/lib/composio/toolkits";
import { ComposioToolkitCard } from "./composio-toolkit-card";
import { Button } from "@/components/ui/button";

interface Props {
  selectedToolkits: string[];
  onSelectionChange: (toolkits: string[]) => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
}

export function ComposioToolkitGrid({
  selectedToolkits,
  onSelectionChange,
  onSave,
  saving,
  hasChanges,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<ToolkitCategory>("recommended");

  const filteredToolkits = useMemo(() => {
    if (activeCategory === "all") return COMPOSIO_TOOLKITS;
    if (activeCategory === "recommended")
      return COMPOSIO_TOOLKITS.filter((t) => t.recommended);
    return COMPOSIO_TOOLKITS.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const handleToggle = (toolkitId: string) => {
    if (selectedToolkits.includes(toolkitId)) {
      onSelectionChange(selectedToolkits.filter((id) => id !== toolkitId));
    } else {
      onSelectionChange([...selectedToolkits, toolkitId]);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h4 className="font-headline text-base text-foreground">
            Toolkits
          </h4>
          <p className="text-foreground/50 text-sm mt-0.5">
            Select which services your assistant can access.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onSave}
          loading={saving}
          disabled={!hasChanges}
        >
          Save Toolkits
        </Button>
      </div>

      {/* Category tabs */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {TOOLKIT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredToolkits.map((toolkit) => (
            <ComposioToolkitCard
              key={toolkit.id}
              toolkit={toolkit}
              selected={selectedToolkits.includes(toolkit.id)}
              onToggle={() => handleToggle(toolkit.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
