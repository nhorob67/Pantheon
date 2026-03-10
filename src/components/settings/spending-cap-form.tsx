"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils/format";
import { useAsyncFormState } from "@/hooks/use-async-form-state";
import { useToast } from "@/components/ui/toast";

export function SpendingCapForm() {
  const [loading, setLoading] = useState(true);
  const { saving, run } = useAsyncFormState();
  const { toast } = useToast();
  const [capDollars, setCapDollars] = useState("");
  const [autoPause, setAutoPause] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [currentCents, setCurrentCents] = useState(0);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch("/api/customers/spending-cap")
      .then((r) => r.json())
      .then((data) => {
        if (data.spending_cap_cents) {
          setCapDollars(String(data.spending_cap_cents / 100));
        }
        setAutoPause(data.spending_cap_auto_pause || false);
        setAlertEmail(data.alert_email || "");
        setCurrentCents(data.current_cents || 0);
        setPercentage(data.percentage);
        setPaused(!!data.spending_paused_at);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
          <button
            type="button"
            role="switch"
            aria-checked={autoPause}
            onClick={() => setAutoPause(!autoPause)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoPause ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoPause ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm text-foreground/70 mb-1.5">
            Alert Email (optional)
          </label>
          <input
            type="email"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            placeholder="alerts@yourfarm.com"
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
