"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function AlertPreferencesForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    spending_alerts_enabled: true,
    spending_alert_email: true,
    spending_alert_dashboard: true,
    weather_severe_enabled: true,
    weather_severe_discord: true,
    price_movement_enabled: true,
    price_movement_threshold_cents: 10,
    price_movement_discord: true,
    ticket_anomaly_enabled: true,
    ticket_anomaly_discord: true,
  });

  useEffect(() => {
    fetch("/api/customers/alert-preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs((prev) => ({ ...prev, ...data }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = (key: string, value: boolean | number) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/customers/alert-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    toast("Alert preferences saved", "success");
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 animate-pulse h-64" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Spending alerts */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base font-semibold mb-2">
          Spending Alerts
        </h3>
        <div className="divide-y divide-border">
          <ToggleRow
            label="Spending threshold alerts"
            description="Get notified at 50%, 80%, and 100% of your cap"
            checked={prefs.spending_alerts_enabled}
            onChange={(v) => update("spending_alerts_enabled", v)}
          />
          <ToggleRow
            label="Email notifications"
            description="Send email alerts at 80% and above"
            checked={prefs.spending_alert_email}
            onChange={(v) => update("spending_alert_email", v)}
          />
          <ToggleRow
            label="Dashboard notifications"
            description="Show alerts in your dashboard"
            checked={prefs.spending_alert_dashboard}
            onChange={(v) => update("spending_alert_dashboard", v)}
          />
        </div>
      </div>

      {/* Farm alerts */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-headline text-base font-semibold">
            Farm Alerts
          </h3>
        </div>
        <p className="text-xs text-foreground/50 mb-3">
          These alerts are delivered through your Discord assistant.
        </p>

        <div className="divide-y divide-border">
          <ToggleRow
            label="Severe weather alerts"
            description="NWS severe weather warnings for your area"
            checked={prefs.weather_severe_enabled}
            onChange={(v) => update("weather_severe_enabled", v)}
          />
          <ToggleRow
            label="Price movement alerts"
            description="Grain price changes above threshold"
            checked={prefs.price_movement_enabled}
            onChange={(v) => update("price_movement_enabled", v)}
          />
          {prefs.price_movement_enabled && (
            <div className="py-3 pl-4">
              <label className="block text-xs text-foreground/60 mb-1">
                Price threshold (cents per bushel)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={prefs.price_movement_threshold_cents}
                onChange={(e) =>
                  update(
                    "price_movement_threshold_cents",
                    parseInt(e.target.value, 10) || 10
                  )
                }
                className="w-24 border border-border-light rounded-lg bg-input px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          <ToggleRow
            label="Scale ticket anomaly alerts"
            description="Unusual weight or moisture readings"
            checked={prefs.ticket_anomaly_enabled}
            onChange={(v) => update("ticket_anomaly_enabled", v)}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} loading={saving}>
        Save Preferences
      </Button>
    </div>
  );
}
