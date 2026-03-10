"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createHeartbeatConfigDraft,
  HeartbeatConfigEditor,
  type HeartbeatConfigDraft,
} from "./heartbeat-config-editor";
import { HeartbeatAgentOverrides } from "./heartbeat-agent-overrides";
import { HeartbeatIssuesPanel } from "./heartbeat-issues-panel";
import { HeartbeatReportingWorkspace } from "./heartbeat-reporting-workspace";
import { HeartbeatOperatorBar } from "./heartbeat-operator-bar";
import { HeartbeatConfigDiagnostics } from "./heartbeat-config-diagnostics";
import {
  HeartbeatSettingsProvider,
  useHeartbeatSettings,
  type HeartbeatAgent,
} from "./heartbeat-settings-context";
import type { HeartbeatConfig } from "@/types/heartbeat";
import type { HeartbeatActivityData } from "@/lib/queries/heartbeat-activity";

interface HeartbeatSettingsPanelProps {
  tenantId: string;
  initialActivity: HeartbeatActivityData;
  agents: HeartbeatAgent[];
}

function buildDraftFromConfig(
  config: HeartbeatConfig | null
): HeartbeatConfigDraft {
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

export function HeartbeatSettingsPanel({
  tenantId,
  initialActivity,
  agents,
}: HeartbeatSettingsPanelProps) {
  return (
    <HeartbeatSettingsProvider
      tenantId={tenantId}
      agents={agents}
      initialActivity={initialActivity}
    >
      <HeartbeatSettingsPanelInner initialActivity={initialActivity} />
    </HeartbeatSettingsProvider>
  );
}

function HeartbeatSettingsPanelInner({
  initialActivity,
}: {
  initialActivity: HeartbeatActivityData;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { tenantId, channelOptions, configs } = useHeartbeatSettings();

  const defaultConfig =
    configs.find((config) => config.agent_id === null) || null;
  const [defaultDraft, setDefaultDraft] = useState(() =>
    buildDraftFromConfig(defaultConfig)
  );
  const [saving, setSaving] = useState(false);
  const [pauseResumeRunning, setPauseResumeRunning] = useState(false);

  const activeOverrideCount = configs.filter(
    (config) => config.agent_id !== null && config.enabled
  ).length;

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
      throw new Error(
        (payload as { error?: { message?: string } }).error?.message ||
          "Save failed"
      );
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
    setPauseResumeRunning(true);
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
        error instanceof Error
          ? error.message
          : "Failed to update heartbeat state",
        "error"
      );
    } finally {
      setPauseResumeRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <HeartbeatOperatorBar
        defaultDraft={defaultDraft}
        onPauseResume={handlePauseResume}
        pauseResumeRunning={pauseResumeRunning}
      />

      <HeartbeatConfigEditor
        value={defaultDraft}
        onChange={setDefaultDraft}
        channelOptions={channelOptions}
        headingPrefix="Tenant default"
        scopeMode="tenant_default"
        hasActiveAgentOverrides={activeOverrideCount > 0}
      />

      <HeartbeatConfigDiagnostics />

      <HeartbeatAgentOverrides
        overrides={configs.filter(
          (config) => config.agent_id !== null
        )}
        defaultTemplate={defaultDraft}
      />

      <Button onClick={handleSave} disabled={saving} loading={saving}>
        Save Tenant Default
      </Button>

      <HeartbeatReportingWorkspace overview={initialActivity} />

      <HeartbeatIssuesPanel issues={initialActivity.activeIssues} />
    </div>
  );
}
