"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface HeartbeatCustomChecksProps {
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function HeartbeatCustomChecks({
  items,
  onChange,
  disabled,
  disabledReason,
}: HeartbeatCustomChecksProps) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.length >= 10 || disabled) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    if (disabled) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base font-semibold mb-1">
        Custom Checklist
      </h3>
      <p className="text-xs text-foreground/50 mb-4">
        Add anything else you want your assistant to keep an eye on. These
        always trigger an AI check-in. Max 10 items.
      </p>
      {disabledReason && (
        <p className="text-[11px] text-foreground/40 mb-4">{disabledReason}</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2 mb-4">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2"
            >
              <span className="text-sm flex-1">{item}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeItem(i)}
                className="text-foreground/40 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < 10 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            disabled={disabled}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="e.g., Check if fertilizer prices dropped below $400/ton"
            maxLength={200}
            className="flex-1 border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-foreground/30"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!newItem.trim() || disabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm font-medium text-foreground/70 hover:bg-muted/80 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}
