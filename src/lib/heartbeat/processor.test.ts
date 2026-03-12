import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveEffectiveManualConfigs,
  resolveEffectiveScheduledConfigs,
  type HeartbeatExecutionConfig,
} from "./effective-configs.ts";
import {
  buildHeartbeatDecisionTrace,
  buildHeartbeatFreshnessMetadata,
} from "./observability.ts";
import type { CheapCheckResult } from "@/types/heartbeat";

function buildConfig(input: Partial<HeartbeatExecutionConfig>): HeartbeatExecutionConfig {
  return {
    id: input.id || "config-default",
    tenant_id: input.tenant_id || "tenant-1",
    customer_id: input.customer_id || "customer-1",
    agent_id: input.agent_id ?? null,
    enabled: input.enabled ?? true,
    interval_minutes: input.interval_minutes ?? 60,
    timezone: input.timezone || "America/Chicago",
    active_hours_start: input.active_hours_start || "05:00",
    active_hours_end: input.active_hours_end || "21:00",
    checks: input.checks || {
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    custom_checks: input.custom_checks || [],
    delivery_channel_id: input.delivery_channel_id ?? "channel-1",
    cooldown_minutes: input.cooldown_minutes ?? 120,
    max_alerts_per_day: input.max_alerts_per_day ?? 6,
    digest_enabled: input.digest_enabled ?? false,
    digest_window_minutes: input.digest_window_minutes ?? 120,
    reminder_interval_minutes: input.reminder_interval_minutes ?? 1440,
    heartbeat_instructions: input.heartbeat_instructions ?? "",
    last_run_at: input.last_run_at ?? null,
    next_run_at: input.next_run_at ?? null,
    effective_scope: input.effective_scope ?? (input.agent_id ? "agent_scoped_only" : "all_checks"),
  };
}

test("resolveEffectiveScheduledConfigs keeps tenant default checks alongside enabled overrides", () => {
  const defaultConfig = buildConfig({ id: "default", agent_id: null });
  const agentOverride = buildConfig({ id: "override", agent_id: "agent-1" });

  const result = resolveEffectiveScheduledConfigs([defaultConfig, agentOverride]);

  assert.deepEqual(
    result.executable.map((config) => [config.id, config.effective_scope]),
    [
      ["default", "tenant_scoped_only"],
      ["override", "agent_scoped_only"],
    ]
  );
  assert.equal(result.shadowedDefaults.length, 0);
});

test("resolveEffectiveScheduledConfigs keeps tenant default when no override is enabled", () => {
  const defaultConfig = buildConfig({ id: "default", agent_id: null });
  const disabledOverride = buildConfig({
    id: "override",
    agent_id: "agent-1",
    enabled: false,
  });

  const result = resolveEffectiveScheduledConfigs([defaultConfig, disabledOverride]);

  assert.deepEqual(
    result.executable.map((config) => [config.id, config.effective_scope]),
    [["default", "all_checks"]]
  );
  assert.equal(result.shadowedDefaults.length, 0);
});

test("resolveEffectiveManualConfigs follows effective scheduler semantics when no config is requested", () => {
  const defaultConfig = buildConfig({ id: "default", agent_id: null });
  const overrideA = buildConfig({ id: "override-a", agent_id: "agent-1" });
  const overrideB = buildConfig({ id: "override-b", agent_id: "agent-2" });

  const result = resolveEffectiveManualConfigs([
    defaultConfig,
    overrideA,
    overrideB,
  ]);

  assert.deepEqual(
    result.map((config) => [config.id, config.effective_scope]),
    [
      ["default", "tenant_scoped_only"],
      ["override-a", "agent_scoped_only"],
      ["override-b", "agent_scoped_only"],
    ]
  );
});

test("resolveEffectiveManualConfigs allows explicitly targeting a disabled config", () => {
  const defaultConfig = buildConfig({ id: "default", agent_id: null, enabled: false });
  const override = buildConfig({ id: "override", agent_id: "agent-1" });

  const result = resolveEffectiveManualConfigs(
    [defaultConfig, override],
    "default"
  );

  assert.deepEqual(
    result.map((config) => [config.id, config.effective_scope]),
    [["default", "tenant_scoped_only"]]
  );
});

test("buildHeartbeatFreshnessMetadata keeps only observability payloads", () => {
  const results: Record<string, CheapCheckResult> = {
    unanswered_emails: {
      status: "alert",
      summary: "3 unanswered email(s) older than 2h",
      data: { count: 3, threshold_hours: 2 },
      observability: { oldest_matching_created_at: "2026-03-09T08:00:00.000Z" },
    },
    custom_checks: {
      status: "alert",
      summary: "2 custom check(s) need LLM evaluation",
    },
  };

  const freshness = buildHeartbeatFreshnessMetadata(results);

  assert.deepEqual(freshness, {
    unanswered_emails: { oldest_matching_created_at: "2026-03-09T08:00:00.000Z" },
  });
});

test("buildHeartbeatDecisionTrace captures selected signals and runtime deferment context", () => {
  const trace = buildHeartbeatDecisionTrace({
    requestTraceId: "trace-1",
    previewOnly: false,
    hadSignal: true,
    checksOutput: {
      unanswered_emails: {
        status: "alert",
        summary: "3 unanswered email(s) older than 2h",
      },
      custom_checks: {
        status: "ok",
        summary: "No custom checks configured",
      },
    },
    signalFingerprints: ["fp-1"],
    issuePlan: {
      activeIssues: [{}],
      newIssues: [{}],
      updatedIssues: [],
      resolvedIssueIds: [],
      notificationCandidates: [
        {
          issue: { signal_type: "unanswered_emails" },
          attentionType: "new_issue",
        },
      ],
      suppressedReasons: ["busy_runtime_running"],
    },
    busyRuntimeReason: "busy_runtime_running",
    deliveryAttempted: false,
    deliveryStatus: "deferred",
    finalReason: "busy_runtime_running",
  });

  assert.equal(trace.request_trace_id, "trace-1");
  assert.deepEqual(trace.signal_types, ["unanswered_emails"]);
  assert.deepEqual(trace.selected_signal_types, ["unanswered_emails"]);
  assert.deepEqual(trace.selected_attention_types, ["new_issue"]);
  assert.equal(trace.busy_runtime_reason, "busy_runtime_running");
  assert.equal(trace.delivery_status, "deferred");
  assert.equal(trace.final_reason, "busy_runtime_running");
});
