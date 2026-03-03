"use client";

import { useState } from "react";

interface BriefingConfig {
  enabled: boolean;
  send_time: string;
  timezone: string;
  channel_id: string;
  sections: {
    weather: boolean;
    grain_bids: boolean;
    ticket_summary: boolean;
  };
}

interface BriefingConfigPanelProps {
  tenantId: string;
  initialConfig: BriefingConfig | null;
}

const TIMEZONES = [
  "America/Chicago",
  "America/Denver",
  "America/New_York",
  "America/Los_Angeles",
];

export function BriefingConfigPanel({
  tenantId,
  initialConfig,
}: BriefingConfigPanelProps) {
  const [config, setConfig] = useState<BriefingConfig>(
    initialConfig || {
      enabled: false,
      send_time: "06:30",
      timezone: "America/Chicago",
      channel_id: "",
      sections: { weather: true, grain_bids: true, ticket_summary: false },
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/briefings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save briefing configuration");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Enable Morning Briefing
          </p>
          <p className="text-xs text-foreground/60">
            Receive a daily summary in your Discord channel
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Time & Timezone */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Send Time
              </label>
              <input
                type="time"
                value={config.send_time}
                onChange={(e) =>
                  setConfig({ ...config, send_time: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={(e) =>
                  setConfig({ ...config, timezone: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace("America/", "").replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Channel ID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Discord Channel ID
            </label>
            <input
              type="text"
              value={config.channel_id}
              onChange={(e) =>
                setConfig({ ...config, channel_id: e.target.value })
              }
              placeholder="e.g., 1234567890123456789"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40"
            />
            <p className="mt-1 text-xs text-foreground/60">
              Right-click the channel in Discord and copy the channel ID
            </p>
          </div>

          {/* Sections */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Briefing Sections
            </p>
            <div className="space-y-3">
              {[
                {
                  key: "weather" as const,
                  label: "Weather Forecast",
                  description:
                    "Temperature, wind, precipitation, spray windows",
                },
                {
                  key: "grain_bids" as const,
                  label: "Grain Bids",
                  description:
                    "Cash bids from configured elevators, basis changes",
                },
                {
                  key: "ticket_summary" as const,
                  label: "Scale Ticket Summary",
                  description:
                    "Yesterday's deliveries, bushels by crop, load counts",
                },
              ].map((section) => (
                <label
                  key={section.key}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={config.sections[section.key]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sections: {
                          ...config.sections,
                          [section.key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm text-foreground">{section.label}</p>
                    <p className="text-xs text-foreground/60">
                      {section.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        {saved && (
          <span className="text-sm text-green-500">Saved successfully</span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
