"use client";

import { CloudAlert, TrendingUp, ClipboardList, Mail, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  disabled?: boolean;
  disabledReason?: string;
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
  disabled,
  disabledReason,
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
        <Switch
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          size="sm"
        />
      </div>
      <p className="text-xs text-foreground/50 mb-2">{description}</p>
      {disabledReason && (
        <p className="text-[11px] text-foreground/40 mb-2">{disabledReason}</p>
      )}

      {checked && thresholdLabel && onThresholdChange && (
        <div className="mt-2 pt-2 border-t border-border">
          <label className="flex items-center justify-between">
            <span className="text-xs text-foreground/60">{thresholdLabel}</span>
            <input
              type="number"
              disabled={disabled}
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
