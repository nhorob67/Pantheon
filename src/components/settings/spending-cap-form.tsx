"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCents } from "@/lib/utils/format";
import { useAsyncFormState } from "@/hooks/use-async-form-state";
import { useToast } from "@/components/ui/toast";
import { jsonFetcher } from "@/lib/utils/fetcher";

export function SpendingCapForm() {
  const { data: serverData, isLoading: loading, mutate } = useSWR(
    "/api/customers/spending-cap",
    jsonFetcher
  );
  const { saving, run } = useAsyncFormState();
  const { toast } = useToast();

  // Track user edits so we can derive initial values from server data
  const [edits, setEdits] = useState<{
    capDollars?: string;
    autoPause?: boolean;
    alertEmail?: string;
  }>({});
  const prevServerKey = useRef<string | undefined>(undefined);

  // Reset edits when server data changes (e.g. after save + revalidation)
  const serverKey = serverData
    ? `${serverData.spending_cap_cents}-${serverData.spending_cap_auto_pause}-${serverData.alert_email}`
    : undefined;
  if (serverKey !== prevServerKey.current) {
    prevServerKey.current = serverKey;
    if (Object.keys(edits).length > 0) setEdits({});
  }

  const capDollars = edits.capDollars ?? (serverData?.spending_cap_cents
    ? String(serverData.spending_cap_cents / 100)
    : "");
  const autoPause = edits.autoPause ?? (serverData?.spending_cap_auto_pause || false);
  const alertEmail = edits.alertEmail ?? (serverData?.alert_email || "");

  const setCapDollars = (v: string) => setEdits((e) => ({ ...e, capDollars: v }));
  const setAutoPause = (v: boolean) => setEdits((e) => ({ ...e, autoPause: v }));
  const setAlertEmail = (v: string) => setEdits((e) => ({ ...e, alertEmail: v }));

  const currentCents: number = serverData?.current_cents || 0;
  const percentage: number | null = serverData?.percentage ?? null;
  const paused = !!serverData?.spending_paused_at;

  const handleSave = () => {
    run(async () => {
      const capCents = capDollars ? Math.round(parseFloat(capDollars) * 100) : null;

      const res = await fetch("/api/customers/spending-cap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spending_cap_cents: capCents,
          spending_cap_auto_pause: autoPause,
          alert_email: alertEmail || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save spending cap");
      }
      mutate();
      toast("Spending cap saved", "success");
    });
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-headline text-lg font-semibold">Spending Cap</h3>
      </div>

      {paused && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-sm font-semibold text-destructive">
            Assistant Paused
          </p>
          <p className="text-xs text-destructive/80 mt-0.5">
            Your spending cap has been reached. Increase your cap below to resume your assistant.
          </p>
        </div>
      )}

      {percentage !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-foreground/50 mb-1">
            <span>{formatCents(currentCents)} used</span>
            <span>{percentage}%</span>
          </div>
          <div className="bg-muted rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all ${
                percentage >= 100
                  ? "bg-destructive"
                  : percentage >= 80
                    ? "bg-energy"
                    : "bg-primary"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            Monthly Cap ($)
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={capDollars}
            onChange={(e) => setCapDollars(e.target.value)}
            placeholder="e.g. 50"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-2.5 outline-none transition-colors text-sm"
          />
          <p className="text-xs text-foreground/60 mt-1">
            Leave empty to disable. Alerts at 50%, 80%, and 100%.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-pause at cap</p>
            <p className="text-xs text-foreground/50">
              Pause your assistant when spending exceeds the cap
            </p>
          </div>
          <Switch checked={autoPause} onChange={setAutoPause} />
        </div>

        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            Alert Email (optional)
          </label>
          <input
            type="email"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            placeholder="alerts@yourteam.com"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-2.5 outline-none transition-colors text-sm"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} loading={saving} size="sm">
          Save Spending Cap
        </Button>
      </div>
    </div>
  );
}
