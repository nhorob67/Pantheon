import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GUARDRAIL_EVAL_SCENARIOS,
  SCENARIO_COUNTS,
  type GuardrailEvalScenario,
} from "./guardrail-scenarios.ts";
import { scoreGuardrailOutcome, scoreMiddlewareOutcome } from "./guardrail-scorer.ts";
import {
  LAUNCH_BLOCKERS,
  evaluateLaunchReadiness,
} from "./guardrail-launch-blockers.ts";
import {
  createGuardrailMonitor,
  DEFAULT_GUARDRAIL_CONFIG,
  type DelegationAncestry,
} from "@/lib/runtime/guardrails.ts";
import {
  createDefaultGuardrailPipeline,
  type GuardrailHookContext,
} from "@/lib/runtime/guardrail-middleware.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCoreGuardrailScenario(scenario: GuardrailEvalScenario) {
  // Use different ancestry chains depending on the scenario
  let ancestry: DelegationAncestry | undefined;
  if (scenario.category === "delegation_recursion") {
    if (scenario.id === "delegation-within-depth-ok") {
      ancestry = { chain: ["agentA", "agentB"] }; // short chain, within depth 5
    } else {
      ancestry = { chain: ["agentA", "agentB", "agentC", "agentD", "agentE"] };
    }
  }

  const guard = createGuardrailMonitor(
    {
      ...DEFAULT_GUARDRAIL_CONFIG,
      retryAllowedTools:
        scenario.category === "adaptive_threshold" ? ["http_request"] : [],
    },
    Date.now(),
    ancestry
  );

  for (const call of scenario.toolCalls) {
    if (guard.halted) break;

    // Delegation recursion check
    if (call.delegationTarget) {
      guard.checkDelegationRecursion(call.delegationTarget);
      continue;
    }

    // Pre-check
    const pre = guard.checkBeforeInvocation(call.toolName, call.args);
    if (!pre.allowed) break;

    // Post-check (if result provided)
    if (call.result !== undefined) {
      const post = guard.checkAfterInvocation(
        call.toolName,
        call.args,
        call.result
      );
      if (!post.allowed) break;
    }

    // Browser progress check
    if (call.browserState) {
      const bp = guard.checkBrowserProgress(
        call.toolName,
        call.browserState.url,
        call.browserState.snapshotDigest
      );
      if (!bp.allowed) break;
    }
  }

  return guard;
}

function runMiddlewareScenario(scenario: GuardrailEvalScenario) {
  const pipeline = createDefaultGuardrailPipeline({ maxWebFetchPerRun: 20 });
  const toolCounts = new Map<string, number>();
  const toolTimestamps = new Map<string, number[]>();
  let totalWarnings = 0;
  let halted = false;

  for (const call of scenario.toolCalls) {
    if (halted) break;

    // Pre-check
    const ctx: GuardrailHookContext = {
      toolName: call.toolName,
      args: call.args,
      totalInvocations: toolCounts.size,
      toolInvocationCounts: toolCounts,
      toolTimestamps,
    };
    const preResult = pipeline.runBefore(ctx);
    if (!preResult.allowed) {
      halted = true;
      break;
    }
    totalWarnings += preResult.warnings.length;
    toolCounts.set(call.toolName, (toolCounts.get(call.toolName) ?? 0) + 1);

    // Post-check (if result provided)
    if (call.result !== undefined) {
      const postCtx: GuardrailHookContext = {
        ...ctx,
        result: call.result,
      };
      const postResult = pipeline.runAfter(postCtx);
      totalWarnings += postResult.warnings.length;
    }
  }

  return { totalWarnings, halted };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("guardrail evals: scenario coverage", () => {
  it("has scenarios for all required categories", () => {
    const categories = new Set(GUARDRAIL_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("loop_detection"));
    assert.ok(categories.has("budget_enforcement"));
    assert.ok(categories.has("ping_pong"));
    assert.ok(categories.has("delegation_recursion"));
    assert.ok(categories.has("browser_no_progress"));
    assert.ok(categories.has("injection_detection"));
    assert.ok(categories.has("adaptive_threshold"));
    assert.ok(categories.has("rate_limit"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 15 total scenarios", () => {
    assert.ok(
      SCENARIO_COUNTS.total >= 15,
      `only ${SCENARIO_COUNTS.total} scenarios`
    );
  });
});

describe("guardrail evals: core guardrail scenarios", () => {
  const coreCategories = [
    "loop_detection",
    "budget_enforcement",
    "ping_pong",
    "delegation_recursion",
    "browser_no_progress",
    "adaptive_threshold",
  ];

  const coreScenarios = GUARDRAIL_EVAL_SCENARIOS.filter((s) =>
    coreCategories.includes(s.category)
  );

  for (const scenario of coreScenarios) {
    it(`[${scenario.category}] ${scenario.id}: ${scenario.description}`, () => {
      const guard = runCoreGuardrailScenario(scenario);
      const scoring = scoreGuardrailOutcome(guard, scenario.expected);

      if (!scoring.passed) {
        const failures = scoring.checks
          .filter((c) => !c.passed)
          .map((c) => `  ${c.name}: expected ${c.expected}, got ${c.actual}`)
          .join("\n");
        assert.fail(
          `Scenario ${scenario.id} failed (score: ${(scoring.score * 100).toFixed(0)}%):\n${failures}`
        );
      }
      assert.ok(scoring.passed);
    });
  }
});

describe("guardrail evals: middleware scenarios", () => {
  const middlewareCategories = ["injection_detection", "rate_limit"];

  const middlewareScenarios = GUARDRAIL_EVAL_SCENARIOS.filter((s) =>
    middlewareCategories.includes(s.category)
  );

  for (const scenario of middlewareScenarios) {
    it(`[${scenario.category}] ${scenario.id}: ${scenario.description}`, () => {
      const { totalWarnings, halted } = runMiddlewareScenario(scenario);
      const scoring = scoreMiddlewareOutcome(
        totalWarnings,
        halted,
        scenario.expected
      );

      if (!scoring.passed) {
        const failures = scoring.checks
          .filter((c) => !c.passed)
          .map((c) => `  ${c.name}: expected ${c.expected}, got ${c.actual}`)
          .join("\n");
        assert.fail(
          `Scenario ${scenario.id} failed (score: ${(scoring.score * 100).toFixed(0)}%):\n${failures}`
        );
      }
      assert.ok(scoring.passed);
    });
  }
});

describe("guardrail evals: launch blockers", () => {
  it("defines blockers for all required categories", () => {
    const categories = new Set(LAUNCH_BLOCKERS.map((b) => b.category));
    assert.ok(categories.has("detection"));
    assert.ok(categories.has("safety"));
    assert.ok(categories.has("observability"));
    assert.ok(categories.has("config"));
    assert.ok(categories.has("resilience"));
  });

  it("has at least 10 blocker-severity items", () => {
    const blockers = LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker");
    assert.ok(
      blockers.length >= 10,
      `only ${blockers.length} blocker-severity items`
    );
  });

  it("evaluateLaunchReadiness correctly computes readiness when all pass", () => {
    const allPass = LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: true,
      detail: "verified",
    }));
    const readiness = evaluateLaunchReadiness(allPass);
    assert.equal(readiness.ready, true);
    assert.equal(readiness.blockersPassing, readiness.blockersTotal);
  });

  it("evaluateLaunchReadiness marks not-ready when a blocker fails", () => {
    const results = LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity !== "blocker", // fail all blockers
      detail: "test",
    }));
    const readiness = evaluateLaunchReadiness(results);
    assert.equal(readiness.ready, false);
  });

  it("evaluateLaunchReadiness stays ready when only warnings fail", () => {
    const results = LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity === "blocker", // pass all blockers, fail warnings
      detail: "test",
    }));
    const readiness = evaluateLaunchReadiness(results);
    assert.equal(readiness.ready, true);
    assert.equal(readiness.warningsPassing, 0);
  });
});

describe("guardrail evals: scorer mechanics", () => {
  it("scoreGuardrailOutcome returns score 1.0 when all checks pass", () => {
    const guard = createGuardrailMonitor();
    guard.checkBeforeInvocation("tool_a", { x: 1 });

    const scoring = scoreGuardrailOutcome(guard, {
      halted: false,
      warningCount: 0,
      totalInvocations: 1,
    });
    assert.equal(scoring.passed, true);
    assert.equal(scoring.score, 1.0);
  });

  it("scoreGuardrailOutcome returns score < 1.0 on partial failure", () => {
    const guard = createGuardrailMonitor();
    guard.checkBeforeInvocation("tool_a", { x: 1 });

    const scoring = scoreGuardrailOutcome(guard, {
      halted: true, // wrong — guard is not halted
      warningCount: 0,
    });
    assert.equal(scoring.passed, false);
    assert.ok(scoring.score < 1.0);
  });
});
