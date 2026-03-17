import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REGRESSION_EVAL_SCENARIOS, REGRESSION_SCENARIO_COUNTS } from "./regression-scenarios.ts";
import { CHAOS_EVAL_SCENARIOS, CHAOS_SCENARIO_COUNTS } from "./chaos-scenarios.ts";

describe("regression evals: scenario coverage", () => {
  it("has scenarios for all required categories", () => {
    const categories = new Set(REGRESSION_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("approval_flow"));
    assert.ok(categories.has("audit_logging"));
    assert.ok(categories.has("trace_completeness"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(REGRESSION_SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 15 total scenarios", () => {
    assert.ok(
      REGRESSION_SCENARIO_COUNTS.total >= 15,
      `only ${REGRESSION_SCENARIO_COUNTS.total} scenarios`
    );
  });

  it("all scenarios have unique IDs", () => {
    const ids = REGRESSION_EVAL_SCENARIOS.map((s) => s.id);
    assert.equal(ids.length, new Set(ids).size, "duplicate scenario IDs found");
  });

  it("all scenarios have a check specification", () => {
    for (const s of REGRESSION_EVAL_SCENARIOS) {
      assert.ok(s.check, `scenario ${s.id} missing check`);
      assert.ok(s.check.target, `scenario ${s.id} missing check.target`);
      assert.ok(s.check.field, `scenario ${s.id} missing check.field`);
      assert.ok(s.check.condition, `scenario ${s.id} missing check.condition`);
    }
  });

  it("trace completeness covers all major feature surfaces", () => {
    const traceScenarios = REGRESSION_EVAL_SCENARIOS.filter(
      (s) => s.category === "trace_completeness"
    );
    const fields = traceScenarios.map((s) => s.check.field);
    assert.ok(fields.includes("web_citations"), "missing web_citations trace check");
    assert.ok(fields.includes("delegation_events"), "missing delegation_events trace check");
    assert.ok(fields.includes("browser_sessions"), "missing browser_sessions trace check");
    assert.ok(fields.includes("guardrail_summary"), "missing guardrail_summary trace check");
  });
});

describe("chaos evals: scenario coverage", () => {
  it("has scenarios for all required failure categories", () => {
    const categories = new Set(CHAOS_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("mcp_failure"));
    assert.ok(categories.has("browser_failure"));
    assert.ok(categories.has("delegation_failure"));
    assert.ok(categories.has("database_failure"));
    assert.ok(categories.has("trigger_failure"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(CHAOS_SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 10 total scenarios", () => {
    assert.ok(
      CHAOS_SCENARIO_COUNTS.total >= 10,
      `only ${CHAOS_SCENARIO_COUNTS.total} scenarios`
    );
  });

  it("all scenarios have unique IDs", () => {
    const ids = CHAOS_EVAL_SCENARIOS.map((s) => s.id);
    assert.equal(ids.length, new Set(ids).size, "duplicate scenario IDs found");
  });

  it("all scenarios expect runs to complete (no crashes)", () => {
    for (const s of CHAOS_EVAL_SCENARIOS) {
      assert.ok(
        s.expected.runCompletes === true,
        `scenario ${s.id} should expect runCompletes=true (graceful degradation)`
      );
    }
  });

  it("all scenarios have failure injection details", () => {
    for (const s of CHAOS_EVAL_SCENARIOS) {
      assert.ok(s.failureInjection, `scenario ${s.id} missing failureInjection`);
      assert.ok(s.failureInjection.type, `scenario ${s.id} missing failureInjection.type`);
      assert.ok(s.failureInjection.target, `scenario ${s.id} missing failureInjection.target`);
    }
  });

  it("all scenarios describe expected behavior", () => {
    for (const s of CHAOS_EVAL_SCENARIOS) {
      assert.ok(
        s.expected.expectedBehavior.length > 10,
        `scenario ${s.id} has insufficient expectedBehavior description`
      );
    }
  });
});
