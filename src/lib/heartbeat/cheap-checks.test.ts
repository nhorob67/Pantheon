import test from "node:test";
import assert from "node:assert/strict";
import { buildHeartbeatCheckExecutionPlan } from "./check-scope.ts";

test("buildHeartbeatCheckExecutionPlan keeps all enabled checks on tenant-default heartbeat", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "all_checks",
    checks: {
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Follow up on vendor quote"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["unanswered_emails", true, "enabled"],
      ["custom_checks", true, "enabled"],
    ]
  );
});

test("buildHeartbeatCheckExecutionPlan runs only agent-scoped checks on overrides", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "agent_scoped_only",
    checks: {
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Call vendor"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["unanswered_emails", true, "enabled"],
      ["custom_checks", false, "tenant_scoped_only"],
    ]
  );
});

test("buildHeartbeatCheckExecutionPlan skips tenant-default unanswered email checks when overrides are active", () => {
  const plan = buildHeartbeatCheckExecutionPlan({
    scope: "tenant_scoped_only",
    checks: {
      unanswered_emails: true,
      unanswered_emails_threshold_hours: 2,
    },
    customChecks: ["Follow up on vendor quote"],
  });

  assert.deepEqual(
    plan.map((item) => [item.key, item.willRun, item.reason]),
    [
      ["unanswered_emails", false, "agent_scoped_only"],
      ["custom_checks", true, "enabled"],
    ]
  );
});
