"use client";

import { AlertTriangle, Info, AlertCircle, Check } from "lucide-react";
import type { AlertEvent } from "@/types/alerts";

interface AlertEventCardProps {
  alert: AlertEvent;
  onAcknowledge: (id: string) => void;
}

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-energy/10",
    border: "border-energy/20",
    text: "text-amber-700",
  },
  critical: {
    icon: AlertCircle,
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    text: "text-destructive",
  },
};

export function AlertEventCard({ alert, onAcknowledge }: AlertEventCardProps) {
  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;
  const time = new Date(alert.created_at).toLocaleString();

  return (
    <div
      className={`rounded-xl border p-4 ${config.bg} ${config.border} ${
        alert.acknowledged ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-sm font-semibold ${config.text}`}>
              {alert.title}
            </h4>
            <span className="text-xs text-foreground/40 shrink-0">{time}</span>
          </div>
          <p className="text-sm text-foreground/70 mt-1">{alert.message}</p>
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="shrink-0 border border-border hover:bg-muted rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Check className="w-3 h-3" />
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
