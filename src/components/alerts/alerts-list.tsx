"use client";

import { useState } from "react";
import { AlertEventCard } from "@/components/alerts/alert-event-card";
import type { AlertEvent } from "@/types/alerts";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface AlertsListProps {
  initialAlerts: AlertEvent[];
  total: number;
}

export function AlertsList({ initialAlerts, total }: AlertsListProps) {
  const [alerts, setAlerts] = useState(initialAlerts);

  const handleAcknowledge = async (id: string) => {
    await fetch(`/api/customers/alerts/${id}/acknowledge`, { method: "POST" });
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
          : a
      )
    );
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <EmptyState
          icon={Bell}
          title="No alerts yet"
          description="Alerts will appear here when spending thresholds are reached or system events occur."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertEventCard
          key={alert.id}
          alert={alert}
          onAcknowledge={handleAcknowledge}
        />
      ))}
      {total > alerts.length && (
        <p className="text-center text-xs text-foreground/40">
          Showing {alerts.length} of {total} alerts
        </p>
      )}
    </div>
  );
}
