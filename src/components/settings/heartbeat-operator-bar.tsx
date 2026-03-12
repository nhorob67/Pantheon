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
import { useHeartbeatSettings } from "./heartbeat-settings-context";
import type { HeartbeatConfigDraft } from "./heartbeat-config-editor";
import { resolveEffectiveScheduledConfigs } from "@/lib/heartbeat/effective-configs";
import {
  formatHeartbeatLocalTime,
  isWithinHeartbeatActiveHours,
} from "@/lib/heartbeat/schedule";

const EFFECTIVE_TARGET = "__effective__";

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

function extractResults(
  payload: Record<string, unknown>
): OperatorHeartbeatResult[] {
  const topLevel = Array.isArray(payload.results) ? payload.results : null;
  if (topLevel) {
    return topLevel as OperatorHeartbeatResult[];
  }

  const wrapped =
    typeof payload.data === "object" && payload.data !== null
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

interface HeartbeatOperatorBarProps {
  defaultDraft: HeartbeatConfigDraft;
  onPauseResume: () => Promise<void>;
  pauseResumeRunning: boolean;
}

export function HeartbeatOperatorBar({
  defaultDraft,
  onPauseResume,
  pauseResumeRunning,
}: HeartbeatOperatorBarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { tenantId, configs, labelForConfigId } = useHeartbeatSettings();

  const [runningAction, setRunningAction] = useState<
    "preview" | "run" | "test" | null
  >(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(
    null
  );
  const [selectedTarget, setSelectedTarget] = useState<string>(
    EFFECTIVE_TARGET
  );

  const { executable: effectiveConfigs, shadowedDefaults } =
    resolveEffectiveScheduledConfigs(configs);
  const configById = new Map(configs.map((config) => [config.id, config]));
  const shadowedDefaultIds = new Set(
    shadowedDefaults.map((config) => config.id)
  );
  const activeOverrideCount = configs.filter(
    (config) => config.agent_id !== null && config.enabled
  ).length;

  const nextEffectiveRun = effectiveConfigs
    .map((config) => ({
      config,
      timestamp: config.next_run_at
        ? Date.parse(config.next_run_at)
        : Number.POSITIVE_INFINITY,
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp)[0];

  const defaultConfig =
    configs.find((config) => config.agent_id === null) || null;
  const nextRunLabel = nextEffectiveRun
    ? formatHeartbeatLocalTime(
        nextEffectiveRun.config.next_run_at,
        nextEffectiveRun.config.timezone
      )
    : formatHeartbeatLocalTime(
        defaultConfig?.next_run_at ?? null,
        defaultDraft.timezone
      );
  const effectiveModeLabel =
    activeOverrideCount > 0
      ? `${activeOverrideCount} agent override${activeOverrideCount === 1 ? "" : "s"} plus tenant-wide checks`
      : defaultDraft.enabled
        ? "Tenant default active"
        : "No active heartbeat schedule";

  const resolvedTargetConfig =
    selectedTarget === EFFECTIVE_TARGET
      ? null
      : configById.get(selectedTarget) || null;
  const canTriggerAction =
    selectedTarget === EFFECTIVE_TARGET
      ? effectiveConfigs.length > 0
      : resolvedTargetConfig !== null;
  const targetHelpText =
    selectedTarget === EFFECTIVE_TARGET
      ? activeOverrideCount > 0
        ? "Runs tenant-scoped checks on the tenant default plus agent-scoped email checks on enabled overrides."
        : "Runs the tenant default heartbeat config."
      : resolvedTargetConfig?.enabled
        ? `${labelForConfigId(resolvedTargetConfig.id, resolvedTargetConfig.agent_id)} is explicitly targeted.`
        : `${labelForConfigId(resolvedTargetConfig?.id || "", resolvedTargetConfig?.agent_id || null)} is paused but can still be previewed, run manually, or test-sent.`;

  const targetOptions = [
    {
      value: EFFECTIVE_TARGET,
      label:
        activeOverrideCount > 0
          ? "Effective schedule set"
          : "Tenant default (effective)",
    },
    ...configs.map((config) => {
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

  const isAnyActionRunning =
    runningAction !== null || pauseResumeRunning;

  const runOperatorAction = async (action: "preview" | "run" | "test") => {
    setRunningAction(action);
    setLastActionSummary(null);
    try {
      const endpoint =
        action === "test"
          ? `/api/tenants/${tenantId}/heartbeat/test`
          : `/api/tenants/${tenantId}/heartbeat/run-now`;
      const body =
        action === "test"
          ? {
              ...(selectedTarget !== EFFECTIVE_TARGET
                ? { config_id: selectedTarget }
                : {}),
            }
          : {
              preview_only: action === "preview",
              ...(selectedTarget !== EFFECTIVE_TARGET
                ? { config_id: selectedTarget }
                : {}),
            };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        throw new Error(
          (payload.error as { message?: string } | undefined)?.message ||
            "Heartbeat action failed"
        );
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

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 border-l-4 border-l-[#D98C2E]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <HeartPulse className="w-5 h-5 text-[#D98C2E]" />
          <div>
            <h3 className="font-headline text-base">
              Proactive Check-ins
            </h3>
            <p className="text-xs text-foreground/50">
              Runs lightweight checks first and only uses AI when something
              needs attention.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runOperatorAction("preview")}
            disabled={isAnyActionRunning || !canTriggerAction}
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
            disabled={isAnyActionRunning || !canTriggerAction}
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
            disabled={isAnyActionRunning || !canTriggerAction}
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
            onClick={onPauseResume}
            disabled={isAnyActionRunning}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
          >
            {pauseResumeRunning ? (
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
          <p className="text-xs text-foreground/45">{targetHelpText}</p>
          {lastActionSummary && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs whitespace-pre-line text-foreground/75">
              {lastActionSummary}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs text-foreground/60">
          <div className="font-medium text-foreground mb-2">
            Operator notes
          </div>
          <p>
            `Pause` and `Resume` save the current tenant-default draft
            immediately.
          </p>
          <p className="mt-2">
            `Preview` evaluates the selected config without dispatching a
            message.
          </p>
          <p className="mt-2">
            `Test Send` bypasses live checks and sends a clearly labeled
            synthetic heartbeat through the same delivery path.
          </p>
          <p className="mt-2">
            Tenant default remains responsible for tenant-wide checks. Agent
            overrides add agent-scoped email monitoring instead of replacing
            tenant coverage.
          </p>
        </div>
      </div>
    </div>
  );
}
