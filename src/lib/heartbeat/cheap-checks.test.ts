import test from "node:test";
import assert from "node:assert/strict";
import { buildHeartbeatCheckExecutionPlan } from "./check-scope.ts";

test("buildHeartbeatCheckExecutionPlan keeps all enabled checks on tenant-default heartbeat", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "all_checks",
    checks: {
      weather_severe: true,
      grain_price_movement: true,
      grain_price_threshold_cents: 10,
      unreviewed_tickets: true,
      unreviewed_tickets_threshold_hours: 4,
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Follow up on nutrient quote"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["weather_severe", true, "enabled"],
      ["grain_price_movement", true, "enabled"],
      ["unreviewed_tickets", true, "enabled"],
      ["unanswered_emails", true, "enabled"],
      ["custom_checks", true, "enabled"],
    ]
  );
});

test("buildHeartbeatCheckExecutionPlan runs only agent-scoped checks on overrides", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "agent_scoped_only",
    checks: {
      weather_severe: true,
      grain_price_movement: true,
      grain_price_threshold_cents: 10,
      unreviewed_tickets: true,
      unreviewed_tickets_threshold_hours: 4,
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Call agronomist"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["weather_severe", false, "tenant_scoped_only"],
      ["grain_price_movement", false, "tenant_scoped_only"],
      ["unreviewed_tickets", false, "tenant_scoped_only"],
      ["unanswered_emails", true, "enabled"],
      ["custom_checks", false, "tenant_scoped_only"],
    ]
  );
});

test("buildHeartbeatCheckExecutionPlan skips tenant-default unanswered email checks when overrides are active", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "tenant_scoped_only",
    checks: {
      weather_severe: true,
      grain_price_movement: true,
      grain_price_threshold_cents: 10,
      unreviewed_tickets: true,
      unreviewed_tickets_threshold_hours: 4,
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Follow up on nutrient quote"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["weather_severe", true, "enabled"],
      ["grain_price_movement", true, "enabled"],
      ["unreviewed_tickets", true, "enabled"],
      ["unanswered_emails", false, "agent_scoped_only"],
      ["custom_checks", true, "enabled"],
    ]
  );
});
