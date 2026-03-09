"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  HeartPulse,
  Loader2,
  PauseCircle,
  Play,
  PlayCircle,
  SendHorizontal,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  createHeartbeatConfigDraft,
  HeartbeatConfigEditor,
  type HeartbeatConfigDraft,
} from "./heartbeat-config-editor";
import { HeartbeatAgentOverrides } from "./heartbeat-agent-overrides";
import { HeartbeatIssuesPanel } from "./heartbeat-issues-panel";
import { HeartbeatReportingWorkspace } from "./heartbeat-reporting-workspace";
import { resolveEffectiveScheduledConfigs } from "@/lib/heartbeat/effective-configs";
import type { HeartbeatConfig } from "@/types/heartbeat";
import type { HeartbeatActivityData } from "@/lib/queries/heartbeat-activity";
import {
  formatHeartbeatLocalTime,
  isWithinHeartbeatActiveHours,
} from "@/lib/heartbeat/schedule";

const EFFECTIVE_TARGET = "__effective__";

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

interface OperatorHeartbeatResult {
  config_id: string;
  agent_id: string | null;
  heartbeat_run_id: string | null;
  runtime_run_id: string | null;
  status: string;
  had_signal?: boolean;
  delivery_status: string;
  suppressed_reason?: string | null;
  preview_text?: string | null;
  message?: string | null;
}

function buildDraftFromConfig(config: HeartbeatConfig | null): HeartbeatConfigDraft {
  return createHeartbeatConfigDraft({
    enabled: config?.enabled ?? false,
    interval_minutes: config?.interval_minutes ?? 60,
    timezone: config?.timezone ?? "America/Chicago",
    active_hours_start: config?.active_hours_start ?? "05:00",
    active_hours_end: config?.active_hours_end ?? "21:00",
    checks: config?.checks,
    custom_checks: config?.custom_checks,
    delivery_channel_id: config?.delivery_channel_id ?? "",
    cooldown_minutes: config?.cooldown_minutes ?? 120,
    max_alerts_per_day: config?.max_alerts_per_day ?? 6,
    digest_enabled: config?.digest_enabled ?? false,
    digest_window_minutes: config?.digest_window_minutes ?? 120,
    reminder_interval_minutes: config?.reminder_interval_minutes ?? 1440,
    heartbeat_instructions: config?.heartbeat_instructions ?? "",
  });
}

function extractResults(payload: Record<string, unknown>): OperatorHeartbeatResult[] {
  const topLevel = Array.isArray(payload.results) ? payload.results : null;
  if (topLevel) {
    return topLevel as OperatorHeartbeatResult[];
  }

  const wrapped = typeof payload.data === "object" && payload.data !== null
    ? (payload.data as Record<string, unknown>)
    : null;
  if (wrapped && Array.isArray(wrapped.results)) {
    return wrapped.results as OperatorHeartbeatResult[];
  }

  return [];
}

function formatSuppressedReason(value: string | null | undefined): string {
  return (value || "policy").replaceAll("_", " ");
}

function describeOperatorHeartbeatResult(
  result: OperatorHeartbeatResult,
  action: "preview" | "run" | "test"
): string {
  if (result.message) {
    return result.message;
  }

  if (result.delivery_status === "suppressed") {
    if (result.suppressed_reason?.startsWith("busy_runtime_")) {
      return `Deferred: ${formatSuppressedReason(result.suppressed_reason)}`;
    }
    return `Suppressed: ${formatSuppressedReason(result.suppressed_reason)}`;
  }

  if (result.delivery_status === "deferred") {
    return `Deferred: ${formatSuppressedReason(result.suppressed_reason)}`;
  }

  if (result.delivery_status === "awaiting_approval") {
    return "Awaiting operator approval before delivery.";
  }

  if (action === "preview") {
    return result.preview_text || "No alert would be sent right now.";
  }

  if (action === "test") {
    return result.runtime_run_id
      ? "Synthetic heartbeat test queued for delivery."
      : "Test send could not be queued.";
  }

  if (result.runtime_run_id) {
    return "Heartbeat queued for delivery.";
  }

  if (result.had_signal) {
    return "Heartbeat ran without sending a message.";
  }

  return "All enabled checks are clear.";
}

function buildActionSummary(input: {
  results: OperatorHeartbeatResult[];
  action: "preview" | "run" | "test";
  labelForConfigId: (configId: string, agentId: string | null) => string;
}): string | null {
  if (input.results.length === 0) {
    return null;
  }

  if (input.results.length === 1) {
    return describeOperatorHeartbeatResult(input.results[0], input.action);
  }

  return input.results
    .map((result) => {
      const label = input.labelForConfigId(result.config_id, result.agent_id);
      return `- ${label}: ${describeOperatorHeartbeatResult(result, input.action)}`;
    })
    .join("\n");
}

export function HeartbeatSettingsPanel({
  tenantId,
  initialActivity,
  agents,
}: HeartbeatSettingsPanelProps) {
  const router = useRouter();
  const { toast } = useToast();

  const defaultConfig = initialActivity.configs.find((config) => config.agent_id === null) || null;
  const [defaultDraft, setDefaultDraft] = useState(() => buildDraftFromConfig(defaultConfig));
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<"preview" | "run" | "test" | "toggle" | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>(EFFECTIVE_TARGET);

  const { executable: effectiveConfigs, shadowedDefaults } = resolveEffectiveScheduledConfigs(
    initialActivity.configs
  );
  const configById = new Map(initialActivity.configs.map((config) => [config.id, config]));
  const statsByConfigId = new Map(
    initialActivity.configStats.map((stat) => [stat.config_id, stat])
  );
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.display_name]));
  const shadowedDefaultIds = new Set(shadowedDefaults.map((config) => config.id));

  const channelOptions = Array.from(
    new Map(
      agents
        .filter((agent) => agent.discord_channel_id)
        .map((agent) => [
          agent.discord_channel_id as string,
          { value: agent.discord_channel_id as string, label: `#${agent.display_name}` },
        ])
    ).values()
  );

  const activeOverrideCount = initialActivity.configs.filter(
    (config) => config.agent_id !== null && config.enabled
  ).length;
  const nextEffectiveRun = effectiveConfigs
    .map((config) => ({
      config,
      timestamp: config.next_run_at ? Date.parse(config.next_run_at) : Number.POSITIVE_INFINITY,
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)[0];

  const nextRunLabel = nextEffectiveRun
    ? formatHeartbeatLocalTime(
        nextEffectiveRun.config.next_run_at,
        nextEffectiveRun.config.timezone
      )
    : formatHeartbeatLocalTime(defaultConfig?.next_run_at ?? null, defaultDraft.timezone);
  const effectiveModeLabel = activeOverrideCount > 0
    ? `${activeOverrideCount} agent override${activeOverrideCount === 1 ? "" : "s"} plus tenant farm checks`
    : defaultDraft.enabled
      ? "Tenant default active"
      : "No active heartbeat schedule";

  const labelForConfigId = (configId: string, agentId: string | null): string => {
    const config = configById.get(configId);
    const effectiveAgentId = agentId ?? config?.agent_id ?? null;
    if (effectiveAgentId) {
      return agentNameById.get(effectiveAgentId) || "Agent override";
    }

    return "Tenant default";
  };

  const resolvedTargetConfig = selectedTarget === EFFECTIVE_TARGET
    ? null
    : configById.get(selectedTarget) || null;
  const canTriggerAction = selectedTarget === EFFECTIVE_TARGET
    ? effectiveConfigs.length > 0
    : resolvedTargetConfig !== null;
  const targetHelpText = selectedTarget === EFFECTIVE_TARGET
    ? activeOverrideCount > 0
      ? "Runs tenant-scoped checks on the tenant default plus agent-scoped email checks on enabled overrides."
      : "Runs the tenant default heartbeat config."
    : resolvedTargetConfig?.enabled
      ? `${labelForConfigId(resolvedTargetConfig.id, resolvedTargetConfig.agent_id)} is explicitly targeted.`
      : `${labelForConfigId(resolvedTargetConfig?.id || "", resolvedTargetConfig?.agent_id || null)} is paused but can still be previewed, run manually, or test-sent.`;

  const targetOptions = [
    {
      value: EFFECTIVE_TARGET,
      label: activeOverrideCount > 0 ? "Effective schedule set" : "Tenant default (effective)",
    },
    ...initialActivity.configs.map((config) => {
      const baseLabel = labelForConfigId(config.id, config.agent_id);
      const status = config.enabled
        ? shadowedDefaultIds.has(config.id)
          ? "shadowed"
          : "enabled"
        : "paused";
      return {
        value: config.id,
        label: `${baseLabel} (${status})`,
      };
    }),
  ];

  const persistDefaultConfig = async (
    nextDraft: HeartbeatConfigDraft,
    successMessage = "Heartbeat settings saved"
  ) => {
    const res = await fetch(`/api/tenants/${tenantId}/heartbeat`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: nextDraft.enabled,
        interval_minutes: nextDraft.interval_minutes,
        timezone: nextDraft.timezone,
        active_hours_start: nextDraft.active_hours_start,
        active_hours_end: nextDraft.active_hours_end,
        checks: nextDraft.checks,
        custom_checks: nextDraft.custom_checks,
        delivery_channel_id: nextDraft.delivery_channel_id || null,
        cooldown_minutes: nextDraft.cooldown_minutes,
        max_alerts_per_day: nextDraft.max_alerts_per_day,
        digest_enabled: nextDraft.digest_enabled,
        digest_window_minutes: nextDraft.digest_window_minutes,
        reminder_interval_minutes: nextDraft.reminder_interval_minutes,
        heartbeat_instructions: nextDraft.heartbeat_instructions,
      }),
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error((payload as { error?: { message?: string } }).error?.message || "Save failed");
    }

    toast(successMessage, "success");
    router.refresh();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistDefaultConfig(defaultDraft);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePauseResume = async () => {
    setRunningAction("toggle");
    const nextDraft = {
      ...defaultDraft,
      enabled: !defaultDraft.enabled,
    };
    try {
      setDefaultDraft(nextDraft);
      await persistDefaultConfig(
        nextDraft,
        nextDraft.enabled ? "Heartbeat resumed" : "Heartbeat paused"
      );
    } catch (error) {
      setDefaultDraft(defaultDraft);
      toast(
        error instanceof Error ? error.message : "Failed to update heartbeat state",
        "error"
      );
    } finally {
      setRunningAction(null);
    }
  };

  const runOperatorAction = async (action: "preview" | "run" | "test") => {
    setRunningAction(action);
    setLastActionSummary(null);
    try {
      const endpoint = action === "test"
        ? `/api/tenants/${tenantId}/heartbeat/test`
        : `/api/tenants/${tenantId}/heartbeat/run-now`;
      const body = action === "test"
        ? {
            ...(selectedTarget !== EFFECTIVE_TARGET ? { config_id: selectedTarget } : {}),
          }
        : {
            preview_only: action === "preview",
            ...(selectedTarget !== EFFECTIVE_TARGET ? { config_id: selectedTarget } : {}),
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((payload.error as { message?: string } | undefined)?.message || "Heartbeat action failed");
      }

      const results = extractResults(payload);
      setLastActionSummary(
        buildActionSummary({
          results,
          action,
          labelForConfigId,
        })
      );
      toast(
        action === "preview"
          ? "Preview ready"
          : action === "test"
            ? "Synthetic heartbeat test queued"
            : "Heartbeat run started",
        "success"
      );
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Heartbeat action failed",
        "error"
      );
    } finally {
      setRunningAction(null);
    }
  };

  const configDiagnostics = initialActivity.configs.map((config) => {
    const stat = statsByConfigId.get(config.id);
    const isShadowed = shadowedDefaultIds.has(config.id);
    const isEffective = effectiveConfigs.some((entry) => entry.id === config.id);
    const scopeLabel = labelForConfigId(config.id, config.agent_id);
    return {
      id: config.id,
      label: scopeLabel,
      enabled: config.enabled,
      isShadowed,
      isEffective,
      nextRunLabel: formatHeartbeatLocalTime(config.next_run_at, config.timezone),
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
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 border-l-4 border-l-[#D98C2E]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-[#D98C2E]" />
            <div>
              <h3 className="font-headline text-base font-semibold">
                Proactive Check-ins
              </h3>
              <p className="text-xs text-foreground/50">
                Runs lightweight checks first and only uses AI when something needs attention.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runOperatorAction("preview")}
              disabled={runningAction !== null || !canTriggerAction}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
            >
              {runningAction === "preview" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Preview
            </button>
            <button
              type="button"
              onClick={() => runOperatorAction("run")}
              disabled={runningAction !== null || !canTriggerAction}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {runningAction === "run" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendHorizontal className="h-3.5 w-3.5" />
              )}
              Run Now
            </button>
            <button
              type="button"
              onClick={() => runOperatorAction("test")}
              disabled={runningAction !== null || !canTriggerAction}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
            >
              {runningAction === "test" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FlaskConical className="h-3.5 w-3.5" />
              )}
              Test Send
            </button>
            <button
              type="button"
              onClick={handlePauseResume}
              disabled={runningAction !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
            >
              {runningAction === "toggle" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : defaultDraft.enabled ? (
                <PauseCircle className="h-3.5 w-3.5" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              {defaultDraft.enabled ? "Pause" : "Resume"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-xs text-foreground/65 sm:grid-cols-4">
          <div>
            <div className="text-foreground/45">Next run</div>
            <div className="mt-1 font-medium text-foreground">
              {nextRunLabel || "Will be scheduled after save"}
            </div>
          </div>
          <div>
            <div className="text-foreground/45">Active now</div>
            <div className="mt-1 font-medium text-foreground">
              {activeOverrideCount > 0
                ? `${effectiveConfigs.filter((config) =>
                    isWithinHeartbeatActiveHours(
                      config.timezone,
                      config.active_hours_start,
                      config.active_hours_end
                    )
                  ).length}/${effectiveConfigs.length} schedules`
                : isWithinHeartbeatActiveHours(
                    defaultDraft.timezone,
                    defaultDraft.active_hours_start,
                    defaultDraft.active_hours_end
                  )
                  ? "Yes"
                  : "No"}
            </div>
          </div>
          <div>
            <div className="text-foreground/45">Effective mode</div>
            <div className="mt-1 font-medium text-foreground">
              {effectiveModeLabel}
            </div>
          </div>
          <div>
            <div className="text-foreground/45">Tenant default</div>
            <div className="mt-1 font-medium text-foreground">
              {defaultDraft.enabled ? "Enabled" : "Paused"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-foreground/60 mb-1">
                Manual target
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full border border-border rounded-lg bg-input px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-foreground/45">
              {targetHelpText}
            </p>
            {lastActionSummary && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs whitespace-pre-line text-foreground/75">
                {lastActionSummary}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs text-foreground/60">
            <div className="font-medium text-foreground mb-2">Operator notes</div>
            <p>
              `Pause` and `Resume` save the current tenant-default draft immediately.
            </p>
            <p className="mt-2">
              `Preview` evaluates the selected config without dispatching a message.
            </p>
            <p className="mt-2">
              `Test Send` bypasses live checks and sends a clearly labeled synthetic heartbeat through the same delivery path.
            </p>
            <p className="mt-2">
              Tenant default remains responsible for farm-wide checks. Agent overrides add agent-scoped email monitoring instead of replacing farm coverage.
            </p>
          </div>
        </div>
      </div>

      <HeartbeatConfigEditor
        value={defaultDraft}
        onChange={setDefaultDraft}
        channelOptions={channelOptions}
        headingPrefix="Tenant default"
        scopeMode="tenant_default"
        hasActiveAgentOverrides={activeOverrideCount > 0}
      />

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base font-semibold mb-3">
          Execution And Pacing
        </h3>
        <p className="text-xs text-foreground/50 mb-4">
          Per-config suppression, deferment, and quota state. Tenant default keeps farm-wide checks active while overrides add agent-scoped email coverage.
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
                  Deliveries last 24h: {config.recentDeliveries24h}/{config.maxAlertsPerDay}
                </div>
                <div>Suppressed / deferred / approval last 24h: {config.recentSuppressed24h}</div>
                <div>Active issues: {config.activeIssueCount}</div>
                <div>Cooldown: {config.cooldownMinutes} min</div>
                <div>
                  Digest: {config.digestEnabled ? `${config.digestWindowMinutes} min` : "Off"}
                </div>
                <div>Reminder: {config.reminderMinutes} min</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HeartbeatAgentOverrides
        tenantId={tenantId}
        agents={agents}
        overrides={initialActivity.configs.filter((config) => config.agent_id !== null)}
        channelOptions={channelOptions}
        defaultTemplate={defaultDraft}
        configStats={initialActivity.configStats}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-energy hover:bg-amber-600 text-white font-semibold rounded-full px-6 py-3 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Tenant Default
      </button>

      <HeartbeatReportingWorkspace
        tenantId={tenantId}
        overview={initialActivity}
        configs={initialActivity.configs}
        agents={agents}
      />

      <HeartbeatIssuesPanel
        tenantId={tenantId}
        issues={initialActivity.activeIssues}
        configs={initialActivity.configs}
        agents={agents}
      />
    </div>
  );
}
