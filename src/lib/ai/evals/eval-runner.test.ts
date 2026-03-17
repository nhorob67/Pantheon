// ---------------------------------------------------------------------------
// Phase 7.1.7: Eval Runner — Launch Readiness Report
// Aggregates all eval suites and outputs a summary report.
// Run with: npx tsx --test src/lib/ai/evals/eval-runner.test.ts
// ---------------------------------------------------------------------------

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { GUARDRAIL_EVAL_SCENARIOS } from "./guardrail-scenarios.ts";
import { LAUNCH_BLOCKERS as GUARDRAIL_BLOCKERS } from "./guardrail-launch-blockers.ts";
import { MCP_EVAL_SCENARIOS } from "./mcp-scenarios.ts";
import { MCP_LAUNCH_BLOCKERS } from "./mcp-launch-blockers.ts";
import { DELEGATION_EVAL_SCENARIOS } from "./delegation-scenarios.ts";
import { DELEGATION_LAUNCH_BLOCKERS } from "./delegation-launch-blockers.ts";
import { BROWSER_EVAL_SCENARIOS } from "./browser-scenarios.ts";
import { BROWSER_LAUNCH_BLOCKERS } from "./browser-launch-blockers.ts";
import { REGRESSION_EVAL_SCENARIOS } from "./regression-scenarios.ts";
import { CHAOS_EVAL_SCENARIOS } from "./chaos-scenarios.ts";

interface DomainSummary {
  name: string;
  scenarios: number;
  categories: number;
  blockers: number;
  warnings: number;
}

describe("eval runner: launch readiness report", () => {
  const domains: DomainSummary[] = [
    {
      name: "Guardrails",
      scenarios: GUARDRAIL_EVAL_SCENARIOS.length,
      categories: new Set(GUARDRAIL_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: GUARDRAIL_BLOCKERS.filter((b) => b.severity === "blocker").length,
      warnings: GUARDRAIL_BLOCKERS.filter((b) => b.severity === "warning").length,
    },
    {
      name: "MCP",
      scenarios: MCP_EVAL_SCENARIOS.length,
      categories: new Set(MCP_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: MCP_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker").length,
      warnings: MCP_LAUNCH_BLOCKERS.filter((b) => b.severity === "warning").length,
    },
    {
      name: "Delegation",
      scenarios: DELEGATION_EVAL_SCENARIOS.length,
      categories: new Set(DELEGATION_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: DELEGATION_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker").length,
      warnings: DELEGATION_LAUNCH_BLOCKERS.filter((b) => b.severity === "warning").length,
    },
    {
      name: "Browser",
      scenarios: BROWSER_EVAL_SCENARIOS.length,
      categories: new Set(BROWSER_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: BROWSER_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker").length,
      warnings: BROWSER_LAUNCH_BLOCKERS.filter((b) => b.severity === "warning").length,
    },
    {
      name: "Regression",
      scenarios: REGRESSION_EVAL_SCENARIOS.length,
      categories: new Set(REGRESSION_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: 0,
      warnings: 0,
    },
    {
      name: "Chaos",
      scenarios: CHAOS_EVAL_SCENARIOS.length,
      categories: new Set(CHAOS_EVAL_SCENARIOS.map((s) => s.category)).size,
      blockers: 0,
      warnings: 0,
    },
  ];

  const totalScenarios = domains.reduce((sum, d) => sum + d.scenarios, 0);
  const totalCategories = domains.reduce((sum, d) => sum + d.categories, 0);
  const totalBlockers = domains.reduce((sum, d) => sum + d.blockers, 0);
  const totalWarnings = domains.reduce((sum, d) => sum + d.warnings, 0);

  it("covers all 6 eval domains", () => {
    assert.equal(domains.length, 6);
  });

  it("has at least 90 total scenarios across all domains", () => {
    assert.ok(
      totalScenarios >= 90,
      `only ${totalScenarios} total scenarios (need 90+)`
    );
  });

  it("has at least 30 total categories across all domains", () => {
    assert.ok(
      totalCategories >= 30,
      `only ${totalCategories} total categories`
    );
  });

  it("has at least 50 launch blockers", () => {
    assert.ok(
      totalBlockers >= 50,
      `only ${totalBlockers} blocker-severity items`
    );
  });

  it("prints launch readiness summary", () => {
    // This test always passes — it exists to generate the report
    const lines: string[] = [
      "",
      "╔══════════════════════════════════════════════════════════════╗",
      "║              LAUNCH READINESS REPORT                       ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
    ];

    for (const d of domains) {
      lines.push(
        `  ${d.name.padEnd(14)} ${String(d.scenarios).padStart(3)} scenarios | ${String(d.categories).padStart(2)} categories | ${String(d.blockers).padStart(2)} blockers | ${String(d.warnings).padStart(2)} warnings`
      );
    }

    lines.push("");
    lines.push(
      `  TOTAL         ${String(totalScenarios).padStart(3)} scenarios | ${String(totalCategories).padStart(2)} categories | ${String(totalBlockers).padStart(2)} blockers | ${String(totalWarnings).padStart(2)} warnings`
    );
    lines.push("");

    // Print to test output
    console.log(lines.join("\n"));
    assert.ok(true);
  });
});
