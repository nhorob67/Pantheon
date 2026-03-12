import test from "node:test";
import assert from "node:assert/strict";
import { buildHeartbeatIssuePlan, decideHeartbeatIssueDelivery } from "./issues.ts";
import type { HeartbeatExecutionConfig } from "./effective-configs.ts";
import type { HeartbeatAlertSignal } from "./signals.ts";
import type { HeartbeatIssue } from "@/types/heartbeat";

function buildConfig(
  input: Partial<HeartbeatExecutionConfig> = {}
): HeartbeatExecutionConfig {
  return {
    id: input.id || "config-1",
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

function buildSignal(input: Partial<HeartbeatAlertSignal> = {}): HeartbeatAlertSignal {
  return {
    key: input.key || "unanswered_emails",
    summary: input.summary ?? "3 unanswered email(s) older than 2h",
    fingerprint: input.fingerprint || "fp-1",
    data: input.data ?? { count: 3, threshold_hours: 2 },
    severity: input.severity ?? 3,
  };
}

function buildIssue(input: Partial<HeartbeatIssue> = {}): HeartbeatIssue {
  return {
    id: input.id || "issue-1",
    tenant_id: input.tenant_id || "tenant-1",
    config_id: input.config_id || "config-1",
    customer_id: input.customer_id || "customer-1",
    agent_id: input.agent_id ?? null,
    signal_type: input.signal_type || "unanswered_emails",
    fingerprint: input.fingerprint || "fp-1",
    severity: input.severity ?? 3,
    state: input.state || "new",
    summary: input.summary ?? "3 unanswered email(s) older than 2h",
    payload: input.payload ?? { count: 3, threshold_hours: 2 },
    first_seen_at: input.first_seen_at || "2026-03-09T10:00:00.000Z",
    last_seen_at: input.last_seen_at || "2026-03-09T10:00:00.000Z",
    last_notified_at: input.last_notified_at ?? "2026-03-09T10:00:00.000Z",
    last_notification_kind: input.last_notification_kind ?? "new_issue",
    snoozed_until: input.snoozed_until ?? null,
    resolved_at: input.resolved_at ?? null,
    created_at: input.created_at || "2026-03-09T10:00:00.000Z",
    updated_at: input.updated_at || "2026-03-09T10:00:00.000Z",
  };
}

test("buildHeartbeatIssuePlan treats unseen alerts as new issues", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig(),
    existingIssues: [],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  assert.equal(plan.newIssues.length, 1);
  assert.equal(plan.notificationCandidates[0]?.attentionType, "new_issue");
});

test("buildHeartbeatIssuePlan schedules reminders when interval has elapsed", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig({ cooldown_minutes: 60, reminder_interval_minutes: 240 }),
    existingIssues: [
      buildIssue({
        state: "acknowledged",
        last_notified_at: "2026-03-09T06:00:00.000Z",
      }),
    ],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  assert.equal(plan.notificationCandidates[0]?.attentionType, "reminder");
});

test("buildHeartbeatIssuePlan notifies immediately when severity worsens", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig({ cooldown_minutes: 180, reminder_interval_minutes: 1440 }),
    existingIssues: [
      buildIssue({
        severity: 2,
        last_notified_at: "2026-03-09T11:30:00.000Z",
      }),
    ],
    alertSignals: [buildSignal({ severity: 4 })],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  assert.equal(plan.notificationCandidates[0]?.attentionType, "worsened");
});

test("buildHeartbeatIssuePlan suppresses snoozed issues until snooze expires", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig(),
    existingIssues: [
      buildIssue({
        state: "snoozed",
        snoozed_until: "2026-03-09T16:00:00.000Z",
      }),
    ],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  assert.equal(plan.notificationCandidates.length, 0);
  assert.equal(plan.suppressedReasons[0], "issue_snoozed");
});

test("decideHeartbeatIssueDelivery enforces daily caps after lifecycle planning", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig(),
    existingIssues: [],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  const decision = decideHeartbeatIssueDelivery({
    hasSignal: true,
    deliveryChannelId: "channel-1",
    maxAlertsPerDay: 1,
    recentDeliveryCount: 1,
    plan,
    digestEnabled: false,
    digestWindowMinutes: 120,
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  assert.equal(decision.deliveryAttempted, false);
  assert.equal(decision.suppressedReason, "max_alerts_per_day_reached");
});

test("decideHeartbeatIssueDelivery defers non-urgent alerts while tenant runtime is busy", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig(),
    existingIssues: [],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  const decision = decideHeartbeatIssueDelivery({
    hasSignal: true,
    deliveryChannelId: "channel-1",
    maxAlertsPerDay: 6,
    recentDeliveryCount: 0,
    plan,
    digestEnabled: false,
    digestWindowMinutes: 120,
    now: new Date("2026-03-09T12:00:00.000Z"),
    busyRuntimeReason: "busy_runtime_running",
  });

  assert.equal(decision.deliveryAttempted, false);
  assert.equal(decision.deliveryStatus, "deferred");
  assert.equal(decision.suppressedReason, "busy_runtime_running");
  assert.equal(decision.notificationCandidates.length, 0);
});

test("decideHeartbeatIssueDelivery defers non-urgent alerts while digest window is open", () => {
  const plan = buildHeartbeatIssuePlan({
    config: buildConfig({ digest_enabled: true, digest_window_minutes: 180 }),
    existingIssues: [],
    alertSignals: [buildSignal()],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  const decision = decideHeartbeatIssueDelivery({
    hasSignal: true,
    deliveryChannelId: "channel-1",
    maxAlertsPerDay: 6,
    recentDeliveryCount: 0,
    plan,
    digestEnabled: true,
    digestWindowMinutes: 180,
    now: new Date("2026-03-09T12:30:00.000Z"),
  });

  assert.equal(decision.deliveryAttempted, false);
  assert.equal(decision.deliveryStatus, "deferred");
  assert.equal(decision.suppressedReason, "digest_window_open");
});

test("decideHeartbeatIssueDelivery lets high-severity alerts bypass busy runtime deferment", () => {
  const urgentPlan = buildHeartbeatIssuePlan({
    config: buildConfig(),
    existingIssues: [],
    alertSignals: [
      buildSignal({
        key: "unanswered_emails",
        summary: "12 unanswered email(s) older than 2h",
        fingerprint: "email-urgent-fp",
        data: { count: 12, threshold_hours: 2 },
        severity: 5,
      }),
      buildSignal({
        key: "custom_checks",
        summary: "2 custom check(s) need LLM evaluation",
        fingerprint: "custom-fp",
        data: { items: ["Review contract", "Follow up"] },
        severity: 3,
      }),
    ],
    now: new Date("2026-03-09T12:00:00.000Z"),
  });

  const decision = decideHeartbeatIssueDelivery({
    hasSignal: true,
    deliveryChannelId: "channel-1",
    maxAlertsPerDay: 6,
    recentDeliveryCount: 0,
    plan: urgentPlan,
    digestEnabled: true,
    digestWindowMinutes: 180,
    now: new Date("2026-03-09T12:00:00.000Z"),
    busyRuntimeReason: "busy_runtime_awaiting_approval",
  });

  assert.equal(decision.deliveryAttempted, true);
  assert.equal(decision.suppressedReason, null);
  assert.equal(decision.notificationCandidates.length, 1);
  assert.equal(decision.notificationCandidates[0]?.issue.signal_type, "unanswered_emails");
});
