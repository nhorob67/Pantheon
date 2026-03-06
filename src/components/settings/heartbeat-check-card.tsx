"use client";

import { CloudAlert, TrendingUp, ClipboardList, Mail, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "cloud-alert": CloudAlert,
  "trending-up": TrendingUp,
  "clipboard-list": ClipboardList,
  mail: Mail,
};

interface HeartbeatCheckCardProps {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  thresholdLabel?: string;
  thresholdValue?: number;
  thresholdMin?: number;
  thresholdMax?: number;
  onThresholdChange?: (v: number) => void;
}

export function HeartbeatCheckCard({
  icon,
  title,
  description,
  checked,
  onToggle,
  thresholdLabel,
  thresholdValue,
  thresholdMin,
  thresholdMax,
  onThresholdChange,
}: HeartbeatCheckCardProps) {
  const Icon = ICON_MAP[icon] || Mail;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        checked
          ? "border-[#5a8a3c]/40 bg-[#5a8a3c]/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-foreground/60" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onToggle(!checked)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
            checked ? "bg-[#5a8a3c]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              checked ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-foreground/50 mb-2">{description}</p>

      {checked && thresholdLabel && onThresholdChange && (
        <div className="mt-2 pt-2 border-t border-border">
          <label className="flex items-center justify-between">
            <span className="text-xs text-foreground/60">{thresholdLabel}</span>
            <input
              type="number"
              min={thresholdMin}
              max={thresholdMax}
              value={thresholdValue}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) onThresholdChange(v);
              }}
              className="w-16 border border-border rounded-md bg-input px-2 py-1 text-xs text-right outline-none focus:border-primary"
            />
          </label>
        </div>
      )}
    </div>
  );
}
