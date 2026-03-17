import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MCP_EVAL_SCENARIOS, MCP_SCENARIO_COUNTS } from "./mcp-scenarios.ts";
import { MCP_LAUNCH_BLOCKERS, evaluateMcpLaunchReadiness } from "./mcp-launch-blockers.ts";

describe("mcp evals: scenario coverage", () => {
  it("has scenarios for all required categories", () => {
    const categories = new Set(MCP_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("discovery"));
    assert.ok(categories.has("execution"));
    assert.ok(categories.has("connection_lifecycle"));
    assert.ok(categories.has("error_handling"));
    assert.ok(categories.has("health"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(MCP_SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 12 total scenarios", () => {
    assert.ok(MCP_SCENARIO_COUNTS.total >= 12, `only ${MCP_SCENARIO_COUNTS.total} scenarios`);
  });

  it("all scenarios have unique IDs", () => {
    const ids = MCP_EVAL_SCENARIOS.map((s) => s.id);
    assert.equal(ids.length, new Set(ids).size, "duplicate scenario IDs found");
  });

  it("all scenarios have server setup", () => {
    for (const s of MCP_EVAL_SCENARIOS) {
      assert.ok(s.setup.server, `scenario ${s.id} missing server setup`);
      assert.ok(s.setup.server.key, `scenario ${s.id} missing server key`);
    }
  });
});

describe("mcp evals: launch blockers", () => {
  it("defines blockers for all required categories", () => {
    const categories = new Set(MCP_LAUNCH_BLOCKERS.map((b) => b.category));
    assert.ok(categories.has("connection"));
    assert.ok(categories.has("execution"));
    assert.ok(categories.has("safety"));
    assert.ok(categories.has("observability"));
    assert.ok(categories.has("catalog"));
  });

  it("has at least 10 blocker-severity items", () => {
    const blockers = MCP_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker");
    assert.ok(blockers.length >= 10, `only ${blockers.length} blocker-severity items`);
  });

  it("evaluateMcpLaunchReadiness: all pass = ready", () => {
    const allPass = MCP_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: true,
      detail: "verified",
    }));
    const readiness = evaluateMcpLaunchReadiness(allPass);
    assert.equal(readiness.ready, true);
  });

  it("evaluateMcpLaunchReadiness: blocker fail = not ready", () => {
    const results = MCP_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity !== "blocker",
      detail: "test",
    }));
    const readiness = evaluateMcpLaunchReadiness(results);
    assert.equal(readiness.ready, false);
  });
});
