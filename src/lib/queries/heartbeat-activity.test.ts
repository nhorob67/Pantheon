import test from "node:test";
import assert from "node:assert/strict";
import { buildHeartbeatAnalytics } from "./heartbeat-activity.ts";
import type { HeartbeatIssue, HeartbeatRun } from "@/types/heartbeat";

function buildRun(input: Partial<HeartbeatRun>): HeartbeatRun {
  return {
    id: input.id || "run-1",
    config_id: input.config_id || "config-1",
    tenant_id: input.tenant_id || "tenant-1",
    ran_at: input.ran_at || new Date().toISOString(),
    run_slot: input.run_slot ?? null,
    trigger_mode: input.trigger_mode || "scheduled",
    checks_executed: input.checks_executed || {},
    check_durations: input.check_durations || {},
    signal_fingerprints: input.signal_fingerprints || [],
    had_signal: input.had_signal ?? false,
    llm_invoked: input.llm_invoked ?? false,
    delivery_attempted: input.delivery_attempted ?? false,
    delivery_status: input.delivery_status || "not_applicable",
    suppressed_reason: input.suppressed_reason ?? null,
    decision_trace: input.decision_trace || {},
    freshness_metadata: input.freshness_metadata || {},
    dispatch_metadata: input.dispatch_metadata || {},
    runtime_run_id: input.runtime_run_id ?? null,
    tokens_used: input.tokens_used ?? 0,
    duration_ms: input.duration_ms ?? null,
    error_message: input.error_message ?? null,
    created_at: input.created_at || new Date().toISOString(),
  };
}

function buildIssue(input: Partial<HeartbeatIssue>): HeartbeatIssue {
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
    payload: input.payload ?? {},
    first_seen_at: input.first_seen_at || new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_seen_at: input.last_seen_at || new Date().toISOString(),
    last_notified_at: input.last_notified_at ?? null,
    last_notification_kind: input.last_notification_kind ?? null,
    snoozed_until: input.snoozed_until ?? null,
    resolved_at: input.resolved_at ?? null,
    created_at: input.created_at || new Date().toISOString(),
    updated_at: input.updated_at || new Date().toISOString(),
  };
}

test("buildHeartbeatAnalytics summarizes delivery, signal, suppression, and issue age", () => {
  const now = Date.now();
  const runs = [
    buildRun({
      id: "run-dispatched",
      had_signal: true,
      llm_invoked: true,
      delivery_attempted: true,
      delivery_status: "dispatched",
      tokens_used: 180,
      duration_ms: 500,
      decision_trace: {
        selected_signal_types: ["weather_severe"],
      },
    }),
    buildRun({
      id: "run-suppressed",
      had_signal: true,
      delivery_status: "deferred",
      suppressed_reason: "busy_runtime_running",
      duration_ms: 800,
      decision_trace: {
        signal_types: ["unanswered_emails"],
      },
    }),
    buildRun({
      id: "run-guardrail",
      had_signal: true,
      llm_invoked: true,
      delivery_attempted: true,
      delivery_status: "suppressed",
      suppressed_reason: "guardrail_output_pii_detected",
      tokens_used: 120,
      duration_ms: 1500,
      decision_trace: {
        selected_signal_types: ["custom_checks"],
      },
      dispatch_metadata: {
        guardrail_ref: {
          blocked: true,
          stage: "output",
        },
      },
    }),
  ];
  const issues = [
    buildIssue({
      id: "issue-fresh",
      first_seen_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    }),
    buildIssue({
      id: "issue-stale",
      first_seen_at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ];

  const analytics = buildHeartbeatAnalytics(runs, issues);

  assert.equal(
    analytics.delivery_breakdown.some((item) => item.key === "deferred"),
    true
  );
  assert.equal(analytics.signal_breakdown[0]?.key, "custom_checks");
  assert.equal(
    analytics.suppression_breakdown.some((item) => item.key === "guardrail_output_pii_detected"),
    true
  );
  assert.equal(analytics.defer_breakdown.some((item) => item.key === "busy_runtime_running"), true);
  assert.equal(
    analytics.guardrail_breakdown.some((item) => item.key === "guardrail_output_pii_detected"),
    true
  );
  assert.equal(
    analytics.issue_age_breakdown.some((item) => item.key === "under_24h"),
    true
  );
  assert.equal(
    analytics.issue_age_breakdown.some((item) => item.key === "3_to_7d"),
    true
  );
  assert.equal(analytics.avg_duration_ms, 933);
  assert.equal(analytics.p95_duration_ms, 1500);
  assert.equal(analytics.avg_tokens_per_llm_run, 150);
  assert.equal(analytics.runs_with_guardrail_blocks, 1);
});
