import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DELEGATION_EVAL_SCENARIOS, DELEGATION_SCENARIO_COUNTS } from "./delegation-scenarios.ts";
import { DELEGATION_LAUNCH_BLOCKERS, evaluateDelegationLaunchReadiness } from "./delegation-launch-blockers.ts";

describe("delegation evals: scenario coverage", () => {
  it("has scenarios for all required categories", () => {
    const categories = new Set(DELEGATION_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("sync_happy_path"));
    assert.ok(categories.has("async_happy_path"));
    assert.ok(categories.has("depth_limit"));
    assert.ok(categories.has("recursion"));
    assert.ok(categories.has("child_failure"));
    assert.ok(categories.has("fan_out"));
    assert.ok(categories.has("budget_inheritance"));
    assert.ok(categories.has("permission_narrowing"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(DELEGATION_SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 15 total scenarios", () => {
    assert.ok(
      DELEGATION_SCENARIO_COUNTS.total >= 15,
      `only ${DELEGATION_SCENARIO_COUNTS.total} scenarios`
    );
  });

  it("all scenarios have unique IDs", () => {
    const ids = DELEGATION_EVAL_SCENARIOS.map((s) => s.id);
    assert.equal(ids.length, new Set(ids).size, "duplicate scenario IDs found");
  });

  it("all scenarios have parent and target agents", () => {
    for (const s of DELEGATION_EVAL_SCENARIOS) {
      assert.ok(s.setup.parentAgent, `scenario ${s.id} missing parentAgent`);
      assert.ok(s.setup.targetAgent, `scenario ${s.id} missing targetAgent`);
    }
  });

  it("async scenarios have isAsync=true", () => {
    const asyncScenarios = DELEGATION_EVAL_SCENARIOS.filter(
      (s) => s.category === "async_happy_path" || s.category === "fan_out"
    );
    for (const s of asyncScenarios) {
      assert.ok(
        s.setup.isAsync === true,
        `async scenario ${s.id} missing isAsync=true`
      );
    }
  });
});

describe("delegation evals: launch blockers", () => {
  it("defines blockers for all required categories", () => {
    const categories = new Set(DELEGATION_LAUNCH_BLOCKERS.map((b) => b.category));
    assert.ok(categories.has("sync"));
    assert.ok(categories.has("async"));
    assert.ok(categories.has("safety"));
    assert.ok(categories.has("observability"));
    assert.ok(categories.has("budget"));
  });

  it("has at least 12 blocker-severity items", () => {
    const blockers = DELEGATION_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker");
    assert.ok(blockers.length >= 12, `only ${blockers.length} blocker-severity items`);
  });

  it("evaluateDelegationLaunchReadiness: all pass = ready", () => {
    const allPass = DELEGATION_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: true,
      detail: "verified",
    }));
    const readiness = evaluateDelegationLaunchReadiness(allPass);
    assert.equal(readiness.ready, true);
  });

  it("evaluateDelegationLaunchReadiness: blocker fail = not ready", () => {
    const results = DELEGATION_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity !== "blocker",
      detail: "test",
    }));
    const readiness = evaluateDelegationLaunchReadiness(results);
    assert.equal(readiness.ready, false);
  });

  it("evaluateDelegationLaunchReadiness: warning fail = still ready", () => {
    const results = DELEGATION_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity === "blocker",
      detail: "test",
    }));
    const readiness = evaluateDelegationLaunchReadiness(results);
    assert.equal(readiness.ready, true);
    assert.equal(readiness.warningsPassing, 0);
  });
});
