"use client";

import { useState, useCallback } from "react";
import { Loader2, HeartPulse } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { HeartbeatCheckCard } from "./heartbeat-check-card";
import { HeartbeatCustomChecks } from "./heartbeat-custom-checks";
import { HeartbeatAgentOverrides } from "./heartbeat-agent-overrides";
import { HeartbeatActivityPanel } from "./heartbeat-activity-panel";
import type { HeartbeatChecks, HeartbeatConfig } from "@/types/heartbeat";
import type { HeartbeatActivityData } from "@/lib/queries/heartbeat-activity";

const TIMEZONE_OPTIONS = [
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Winnipeg", label: "Central Canada" },
  { value: "America/Regina", label: "Saskatchewan" },
];

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hStr = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    TIME_OPTIONS.push(`${hStr}:${mStr}`);
  }
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

const DEFAULT_CHECKS: HeartbeatChecks = {
  weather_severe: true,
  grain_price_movement: true,
  grain_price_threshold_cents: 10,
  unreviewed_tickets: true,
  unreviewed_tickets_threshold_hours: 4,
  unanswered_emails: true,
  unanswered_emails_threshold_hours: 2,
};

interface Agent {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface HeartbeatSettingsPanelProps {
  tenantId: string;
  initialActivity: HeartbeatActivityData;
  agents: Agent[];
}

export function HeartbeatSettingsPanel({
  tenantId,
  initialActivity,
  agents,
}: HeartbeatSettingsPanelProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const defaultConfig = initialActivity.configs.find((c) => c.agent_id === null);

  const [enabled, setEnabled] = useState(defaultConfig?.enabled ?? false);
  const [intervalMinutes, setIntervalMinutes] = useState(
    defaultConfig?.interval_minutes ?? 60
  );
  const [timezone, setTimezone] = useState(
    defaultConfig?.timezone ?? "America/Chicago"
  );
  const [activeStart, setActiveStart] = useState(
    defaultConfig?.active_hours_start ?? "05:00"
  );
  const [activeEnd, setActiveEnd] = useState(
    defaultConfig?.active_hours_end ?? "21:00"
  );
  const [checks, setChecks] = useState<HeartbeatChecks>(
    (defaultConfig?.checks as HeartbeatChecks) ?? DEFAULT_CHECKS
  );
  const [customChecks, setCustomChecks] = useState<string[]>(
    defaultConfig?.custom_checks ?? []
  );
  const [deliveryChannelId, setDeliveryChannelId] = useState<string>(
    defaultConfig?.delivery_channel_id ?? ""
  );

  // Collect unique channel IDs from agents
  const channelOptions = agents
    .filter((a) => a.discord_channel_id)
    .map((a) => ({ value: a.discord_channel_id!, label: `#${a.display_name}` }));

  const updateCheck = useCallback(
    <K extends keyof HeartbeatChecks>(key: K, value: HeartbeatChecks[K]) => {
      setChecks((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/heartbeat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          interval_minutes: intervalMinutes,
          timezone,
          active_hours_start: activeStart,
          active_hours_end: activeEnd,
          checks,
          custom_checks: customChecks,
          delivery_channel_id: deliveryChannelId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Save failed");
      }

      toast("Heartbeat settings saved", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Master Control */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 border-l-4 border-l-[#D98C2E]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-[#D98C2E]" />
            <div>
              <h3 className="font-headline text-base font-semibold">
                Proactive Check-ins
              </h3>
              <p className="text-xs text-foreground/50">
                Runs lightweight checks first — only uses AI when something needs attention.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              enabled ? "bg-[#5a8a3c]" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Interval */}
            <div>
              <label className="block text-xs text-foreground/60 mb-1">
                Check every
              </label>
              <div className="flex flex-wrap gap-1">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntervalMinutes(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      intervalMinutes === opt.value
                        ? "bg-primary text-white"
                        : "bg-muted text-foreground/60 hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active hours */}
            <div>
              <label className="block text-xs text-foreground/60 mb-1">
                Active hours
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={activeStart}
                  onChange={(e) => setActiveStart(e.target.value)}
                  className="border border-border rounded-lg bg-input px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
                <span className="text-foreground/40 text-xs">to</span>
                <select
                  value={activeEnd}
                  onChange={(e) => setActiveEnd(e.target.value)}
                  className="border border-border rounded-lg bg-input px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs text-foreground/60 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full border border-border rounded-lg bg-input px-3 py-1.5 text-xs outline-none focus:border-primary"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {enabled && (
        <>
          {/* Section 2: What to Check */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-headline text-base font-semibold mb-4">
              What to Check
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HeartbeatCheckCard
                icon="cloud-alert"
                title="Weather Alerts"
                description="NWS severe weather warnings for your area"
                checked={checks.weather_severe}
                onToggle={(v) => updateCheck("weather_severe", v)}
              />
              <HeartbeatCheckCard
                icon="trending-up"
                title="Grain Prices"
                description="Cash bid movements above threshold"
                checked={checks.grain_price_movement}
                onToggle={(v) => updateCheck("grain_price_movement", v)}
                thresholdLabel="Threshold (cents/bu)"
                thresholdValue={checks.grain_price_threshold_cents}
                thresholdMin={1}
                thresholdMax={50}
                onThresholdChange={(v) =>
                  updateCheck("grain_price_threshold_cents", v)
                }
              />
              <HeartbeatCheckCard
                icon="clipboard-list"
                title="Scale Tickets"
                description="Unreviewed tickets older than threshold"
                checked={checks.unreviewed_tickets}
                onToggle={(v) => updateCheck("unreviewed_tickets", v)}
                thresholdLabel="Max age (hours)"
                thresholdValue={checks.unreviewed_tickets_threshold_hours}
                thresholdMin={1}
                thresholdMax={24}
                onThresholdChange={(v) =>
                  updateCheck("unreviewed_tickets_threshold_hours", v)
                }
              />
              <HeartbeatCheckCard
                icon="mail"
                title="Unanswered Email"
                description="Inbound emails without a reply"
                checked={checks.unanswered_emails}
                onToggle={(v) => updateCheck("unanswered_emails", v)}
                thresholdLabel="Max age (hours)"
                thresholdValue={checks.unanswered_emails_threshold_hours}
                thresholdMin={1}
                thresholdMax={24}
                onThresholdChange={(v) =>
                  updateCheck("unanswered_emails_threshold_hours", v)
                }
              />
            </div>
          </div>

          {/* Section 3: Custom Checklist */}
          <HeartbeatCustomChecks
            items={customChecks}
            onChange={setCustomChecks}
          />

          {/* Section 4: Delivery */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="font-headline text-base font-semibold mb-3">
              Delivery Channel
            </h3>
            <p className="text-xs text-foreground/50 mb-3">
              Choose which Discord channel receives heartbeat alerts.
            </p>
            <select
              value={deliveryChannelId}
              onChange={(e) => setDeliveryChannelId(e.target.value)}
              className="w-full max-w-xs border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select a channel</option>
              {channelOptions.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          {/* Section 5: Per-Agent Overrides */}
          <HeartbeatAgentOverrides
            tenantId={tenantId}
            agents={agents}
            overrides={initialActivity.configs.filter((c) => c.agent_id !== null)}
          />
        </>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Settings
      </button>

      {/* Section 6: Activity */}
      <HeartbeatActivityPanel
        dayBuckets={initialActivity.dayBuckets}
        recentRuns={initialActivity.recentRuns}
        stats={initialActivity.stats}
        disabled={!enabled}
      />
    </div>
  );
}
