"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AlertEvent } from "@/types/alerts";
import { jsonFetcher } from "@/lib/utils/fetcher";

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  const { data, mutate } = useSWR(
    isOnboarding ? null : "/api/customers/alerts?limit=5",
    jsonFetcher,
    { revalidateOnFocus: true }
  );

  const alerts: AlertEvent[] = data?.alerts || [];
  const unacknowledged: number = data?.unacknowledged || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAcknowledge = async (id: string) => {
    await fetch(`/api/customers/alerts/${id}/acknowledge`, { method: "POST" });
    mutate(
      (current: typeof data) =>
        current
          ? {
              ...current,
              alerts: current.alerts.map((a: AlertEvent) =>
                a.id === id ? { ...a, acknowledged: true } : a
              ),
              unacknowledged: Math.max(0, (current.unacknowledged || 0) - 1),
            }
          : current,
      { revalidate: false }
    );
  };

  if (isOnboarding) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-foreground/60 hover:text-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unacknowledged > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unacknowledged > 9 ? "9+" : unacknowledged}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg w-80 z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Alerts</span>
            <Link
              href="/alerts"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="p-4 text-sm text-foreground/50 text-center">
                No alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border-b border-border last:border-0 ${
                    !alert.acknowledged ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {alert.title}
                      </p>
                      <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
                        {alert.message}
                      </p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-[10px] text-primary hover:underline shrink-0 mt-0.5"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
