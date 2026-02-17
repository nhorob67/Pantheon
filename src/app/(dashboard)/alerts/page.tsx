"use client";

import { useState, useEffect } from "react";
import { AlertEventCard } from "@/components/alerts/alert-event-card";
import type { AlertEvent } from "@/types/alerts";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/customers/alerts?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          Alerts
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Spending alerts, farm notifications, and system events.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border shadow-sm p-6 animate-pulse h-20"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
          <Bell className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/50 text-sm">No alerts yet.</p>
          <p className="text-foreground/40 text-xs mt-1">
            Alerts will appear here when spending thresholds are reached or farm
            events occur.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
