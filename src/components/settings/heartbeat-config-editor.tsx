"use client";

import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { HeartbeatCheckCard } from "./heartbeat-check-card";
import { HeartbeatCustomChecks } from "./heartbeat-custom-checks";
import type { HeartbeatChecks } from "@/types/heartbeat";

export const TIMEZONE_OPTIONS = [
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Winnipeg", label: "Central Canada" },
  { value: "America/Regina", label: "Saskatchewan" },
];

export const INTERVAL_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
];

export const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hStr = h.toString().padStart(2, "0");
    const mStr = m.toString().padStart(2, "0");
    TIME_OPTIONS.push(`${hStr}:${mStr}`);
  }
}

export const DEFAULT_HEARTBEAT_CHECKS: HeartbeatChecks = {
  unanswered_emails: true,
  unanswered_emails_threshold_hours: 2,
};

export interface HeartbeatConfigDraft {
  enabled: boolean;
  interval_minutes: number;
  timezone: string;
  active_hours_start: string;
  active_hours_end: string;
  checks: HeartbeatChecks;
  custom_checks: string[];
  delivery_channel_id: string;
  cooldown_minutes: number;
  max_alerts_per_day: number;
  digest_enabled: boolean;
  digest_window_minutes: number;
  reminder_interval_minutes: number;
  heartbeat_instructions: string;
}

interface HeartbeatConfigEditorProps {
  value: HeartbeatConfigDraft;
  onChange: (next: HeartbeatConfigDraft) => void;
  channelOptions: Array<{ value: string; label: string }>;
  headingPrefix?: string;
  scopeMode?: "tenant_default" | "agent_override";
  hasActiveAgentOverrides?: boolean;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function createHeartbeatConfigDraft(
  input?: Partial<HeartbeatConfigDraft>
): HeartbeatConfigDraft {
  return {
    enabled: input?.enabled ?? false,
    interval_minutes: input?.interval_minutes ?? 60,
    timezone: input?.timezone ?? "America/Chicago",
    active_hours_start: input?.active_hours_start ?? "05:00",
    active_hours_end: input?.active_hours_end ?? "21:00",
    checks: input?.checks ?? DEFAULT_HEARTBEAT_CHECKS,
    custom_checks: input?.custom_checks ?? [],
    delivery_channel_id: input?.delivery_channel_id ?? "",
    cooldown_minutes: input?.cooldown_minutes ?? 120,
    max_alerts_per_day: input?.max_alerts_per_day ?? 6,
    digest_enabled: input?.digest_enabled ?? false,
    digest_window_minutes: input?.digest_window_minutes ?? 120,
    reminder_interval_minutes: input?.reminder_interval_minutes ?? 1440,
    heartbeat_instructions: input?.heartbeat_instructions ?? "",
  };
}

export function HeartbeatConfigEditor({
  value,
  onChange,
  channelOptions,
  headingPrefix,
  scopeMode = "tenant_default",
  hasActiveAgentOverrides = false,
}: HeartbeatConfigEditorProps) {
  const updateCheck = useCallback(
    <K extends keyof HeartbeatChecks>(key: K, next: HeartbeatChecks[K]) => {
      onChange({
        ...value,
        checks: {
          ...value.checks,
          [key]: next,
        },
      });
    },
    [onChange, value]
  );

  const setField = <K extends keyof HeartbeatConfigDraft>(
    key: K,
    next: HeartbeatConfigDraft[K]
  ) => {
    onChange({
      ...value,
      [key]: next,
    });
  };

  const titlePrefix = headingPrefix ? `${headingPrefix} ` : "";
  const agentOverrideMode = scopeMode === "agent_override";
  const tenantDefaultEmailHandledByOverrides =
    scopeMode === "tenant_default" && hasActiveAgentOverrides;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base mb-4">
          {titlePrefix}Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-foreground/60 mb-1">
              Check every
            </label>
            <div className="flex flex-wrap gap-1">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField("interval_minutes", opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    value.interval_minutes === opt.value
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground/60 hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-foreground/60 mb-1">
              Active hours
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={value.active_hours_start}
                onChange={(e) => setField("active_hours_start", e.target.value)}
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
                value={value.active_hours_end}
                onChange={(e) => setField("active_hours_end", e.target.value)}
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

          <div>
            <label className="block text-xs text-foreground/60 mb-1">
              Timezone
            </label>
            <select
              value={value.timezone}
              onChange={(e) => setField("timezone", e.target.value)}
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
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base mb-4">
          {titlePrefix}What to Check
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HeartbeatCheckCard
            icon="mail"
            title="Unanswered Email"
            description="Inbound emails without a reply"
            checked={value.checks.unanswered_emails}
            disabled={tenantDefaultEmailHandledByOverrides}
            disabledReason={
              tenantDefaultEmailHandledByOverrides
                ? "Enabled agent overrides own agent-scoped unanswered-email checks."
                : undefined
            }
            onToggle={(next) => updateCheck("unanswered_emails", next)}
            thresholdLabel="Max age (hours)"
            thresholdValue={value.checks.unanswered_emails_threshold_hours}
            thresholdMin={1}
            thresholdMax={24}
            onThresholdChange={(next) =>
              updateCheck("unanswered_emails_threshold_hours", next)
            }
          />
        </div>
      </div>

      <HeartbeatCustomChecks
        items={value.custom_checks}
        onChange={(next) => setField("custom_checks", next)}
        disabled={agentOverrideMode}
        disabledReason={
          agentOverrideMode
            ? "Custom checklist items stay on the tenant-default heartbeat so they only run once per team."
            : undefined
        }
      />

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base mb-3">
          {titlePrefix}Delivery Channel
        </h3>
        <p className="text-xs text-foreground/50 mb-3">
          Choose which Discord channel receives heartbeat alerts.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <select
              value={value.delivery_channel_id}
              onChange={(e) => setField("delivery_channel_id", e.target.value)}
              className="w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select a channel</option>
              {channelOptions.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-foreground/60">
              Cooldown (min)
              <input
                type="number"
                min={5}
                max={1440}
                value={value.cooldown_minutes}
                onChange={(e) =>
                  setField("cooldown_minutes", Number(e.target.value) || 120)
                }
                className="mt-1 w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs text-foreground/60">
              Max alerts/day
              <input
                type="number"
                min={1}
                max={50}
                value={value.max_alerts_per_day}
                onChange={(e) =>
                  setField("max_alerts_per_day", Number(e.target.value) || 6)
                }
                className="mt-1 w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs text-foreground/60">
              Digest mode
              <select
                value={value.digest_enabled ? "enabled" : "disabled"}
                onChange={(e) =>
                  setField("digest_enabled", e.target.value === "enabled")
                }
                className="mt-1 w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="disabled">Immediate</option>
                <option value="enabled">Batch non-urgent alerts</option>
              </select>
            </label>
            <label className="block text-xs text-foreground/60">
              Digest window (min)
              <input
                type="number"
                min={15}
                max={1440}
                disabled={!value.digest_enabled}
                value={value.digest_window_minutes}
                onChange={(e) =>
                  setField("digest_window_minutes", Number(e.target.value) || 120)
                }
                className="mt-1 w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-foreground/60">
              Reminder (min)
              <input
                type="number"
                min={30}
                max={10080}
                value={value.reminder_interval_minutes}
                onChange={(e) =>
                  setField(
                    "reminder_interval_minutes",
                    Number(e.target.value) || 1440
                  )
                }
                className="mt-1 w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground/45">
          New issues notify immediately. Ongoing issues wait for the reminder interval unless
          they worsen. Digest mode batches non-urgent alerts until the window expires, and the daily cap still limits outbound deliveries within a rolling 24-hour window.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base mb-3">
          {titlePrefix}Heartbeat Instructions
        </h3>
        <p className="text-xs text-foreground/50 mb-3">
          Optional guidance for how heartbeat alerts should be framed once an issue is detected.
        </p>
        <Textarea
          value={value.heartbeat_instructions}
          onChange={(e) => setField("heartbeat_instructions", e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Example: mention unresolved customer emails first, then summarize market moves."
          className="w-full rounded-xl text-sm"
        />
        <p className="mt-2 text-xs text-foreground/45">
          {value.heartbeat_instructions.length}/1000 characters
        </p>
      </div>
    </div>
  );
}
