"use client";

import { useHeartbeatSettings } from "./heartbeat-settings-context";
import { resolveEffectiveScheduledConfigs } from "@/lib/heartbeat/effective-configs";
import {
  formatHeartbeatLocalTime,
  isWithinHeartbeatActiveHours,
} from "@/lib/heartbeat/schedule";

export function HeartbeatConfigDiagnostics() {
  const { configs, configStats, labelForConfigId } = useHeartbeatSettings();

  const { executable: effectiveConfigs, shadowedDefaults } =
    resolveEffectiveScheduledConfigs(configs);
  const statsByConfigId = new Map(
    configStats.map((stat) => [stat.config_id, stat])
  );
  const shadowedDefaultIds = new Set(
    shadowedDefaults.map((config) => config.id)
  );

  const configDiagnostics = configs.map((config) => {
    const stat = statsByConfigId.get(config.id);
    const isShadowed = shadowedDefaultIds.has(config.id);
    const isEffective = effectiveConfigs.some(
      (entry) => entry.id === config.id
    );
    const scopeLabel = labelForConfigId(config.id, config.agent_id);
    return {
      id: config.id,
      label: scopeLabel,
      enabled: config.enabled,
      isShadowed,
      isEffective,
      nextRunLabel: formatHeartbeatLocalTime(
        config.next_run_at,
        config.timezone
      ),
      activeNow: isWithinHeartbeatActiveHours(
        config.timezone,
        config.active_hours_start,
        config.active_hours_end
      ),
      recentDeliveries24h: stat?.recent_deliveries_24h ?? 0,
      recentSuppressed24h: stat?.recent_suppressed_24h ?? 0,
      activeIssueCount: stat?.active_issue_count ?? 0,
      cooldownMinutes: config.cooldown_minutes,
      digestEnabled: config.digest_enabled,
      digestWindowMinutes: config.digest_window_minutes,
      reminderMinutes: config.reminder_interval_minutes,
      maxAlertsPerDay: config.max_alerts_per_day,
      hasChannel: Boolean(config.delivery_channel_id),
    };
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base font-semibold mb-3">
        Execution And Pacing
      </h3>
      <p className="text-xs text-foreground/50 mb-4">
        Per-config suppression, deferment, and quota state. Tenant default keeps
        tenant-wide checks active while overrides add agent-scoped email coverage.
      </p>
      <div className="space-y-3">
        {configDiagnostics.map((config) => (
          <div
            key={config.id}
            className="rounded-xl border border-border/70 bg-muted/20 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full bg-[#D98C2E]/10 px-2 py-0.5 font-medium text-[#D98C2E]">
                    {config.label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/60">
                    {config.enabled ? "Enabled" : "Paused"}
                  </span>
                  {config.isEffective && (
                    <span className="inline-flex items-center rounded-full bg-[#5a8a3c]/10 px-2 py-0.5 font-medium text-[#5a8a3c]">
                      Executes now
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-foreground/80">
                  {config.hasChannel
                    ? "Delivery channel configured."
                    : "Missing delivery channel. Runs can evaluate, but no alert can dispatch until a channel is selected."}
                </div>
              </div>
              <div className="text-xs text-foreground/55">
                Next run: {config.nextRunLabel || "Not scheduled"}
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-foreground/55 sm:grid-cols-2 lg:grid-cols-4">
              <div>Active now: {config.activeNow ? "Yes" : "No"}</div>
              <div>
                Deliveries last 24h: {config.recentDeliveries24h}/
                {config.maxAlertsPerDay}
              </div>
              <div>
                Suppressed / deferred / approval last 24h:{" "}
                {config.recentSuppressed24h}
              </div>
              <div>Active issues: {config.activeIssueCount}</div>
              <div>Cooldown: {config.cooldownMinutes} min</div>
              <div>
                Digest:{" "}
                {config.digestEnabled
                  ? `${config.digestWindowMinutes} min`
                  : "Off"}
              </div>
              <div>Reminder: {config.reminderMinutes} min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
