import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BROWSER_EVAL_SCENARIOS, BROWSER_SCENARIO_COUNTS } from "./browser-scenarios.ts";
import { BROWSER_LAUNCH_BLOCKERS, evaluateBrowserLaunchReadiness } from "./browser-launch-blockers.ts";
import { isBlockedHost, isAuthUrl, isSensitiveField } from "@/lib/security/network-guard.ts";

describe("browser evals: scenario coverage", () => {
  it("has scenarios for all required categories", () => {
    const categories = new Set(BROWSER_EVAL_SCENARIOS.map((s) => s.category));
    assert.ok(categories.has("navigation"));
    assert.ok(categories.has("interaction"));
    assert.ok(categories.has("screenshot"));
    assert.ok(categories.has("budget"));
    assert.ok(categories.has("ssrf_protection"));
    assert.ok(categories.has("sensitive_fields"));
    assert.ok(categories.has("session_management"));
    assert.ok(categories.has("approval"));
  });

  it("has at least 1 scenario per category", () => {
    for (const [cat, count] of Object.entries(BROWSER_SCENARIO_COUNTS.byCategory)) {
      assert.ok(count >= 1, `category "${cat}" has only ${count} scenario(s)`);
    }
  });

  it("has at least 19 total scenarios", () => {
    assert.ok(
      BROWSER_SCENARIO_COUNTS.total >= 19,
      `only ${BROWSER_SCENARIO_COUNTS.total} scenarios`
    );
  });

  it("all scenarios have unique IDs", () => {
    const ids = BROWSER_EVAL_SCENARIOS.map((s) => s.id);
    assert.equal(ids.length, new Set(ids).size, "duplicate scenario IDs found");
  });

  it("all scenarios specify a browser tool", () => {
    const validTools = new Set([
      "browser_navigate",
      "browser_extract",
      "browser_click",
      "browser_fill",
      "browser_screenshot",
    ]);
    for (const s of BROWSER_EVAL_SCENARIOS) {
      assert.ok(validTools.has(s.setup.tool), `scenario ${s.id} has invalid tool "${s.setup.tool}"`);
    }
  });
});

describe("browser evals: SSRF protection validation", () => {
  const ssrfScenarios = BROWSER_EVAL_SCENARIOS.filter(
    (s) => s.category === "ssrf_protection"
  );

  for (const scenario of ssrfScenarios) {
    it(`[ssrf] ${scenario.id}: ${scenario.description}`, () => {
      const url = scenario.setup.args.url as string;
      const hostname = new URL(url).hostname;

      if (scenario.expected.errorType === "ssrf_blocked") {
        assert.ok(
          isBlockedHost(hostname),
          `Expected ${hostname} to be blocked by isBlockedHost`
        );
      } else if (scenario.expected.errorType === "auth_url_blocked") {
        assert.ok(
          isAuthUrl(url),
          `Expected ${url} to be blocked by isAuthUrl`
        );
      }
    });
  }
});

describe("browser evals: sensitive field validation", () => {
  const sensitiveScenarios = BROWSER_EVAL_SCENARIOS.filter(
    (s) => s.category === "sensitive_fields"
  );

  for (const scenario of sensitiveScenarios) {
    it(`[sensitive] ${scenario.id}: ${scenario.description}`, () => {
      const fieldDesc = scenario.setup.args.field_description as string;

      if (scenario.expected.errorType === "sensitive_field") {
        assert.ok(
          isSensitiveField(fieldDesc),
          `Expected "${fieldDesc}" to be detected as sensitive`
        );
      } else {
        assert.ok(
          !isSensitiveField(fieldDesc),
          `Expected "${fieldDesc}" to NOT be detected as sensitive`
        );
      }
    });
  }
});

describe("browser evals: launch blockers", () => {
  it("defines blockers for all required categories", () => {
    const categories = new Set(BROWSER_LAUNCH_BLOCKERS.map((b) => b.category));
    assert.ok(categories.has("navigation"));
    assert.ok(categories.has("safety"));
    assert.ok(categories.has("session"));
    assert.ok(categories.has("observability"));
    assert.ok(categories.has("cost"));
  });

  it("has at least 14 blocker-severity items", () => {
    const blockers = BROWSER_LAUNCH_BLOCKERS.filter((b) => b.severity === "blocker");
    assert.ok(blockers.length >= 14, `only ${blockers.length} blocker-severity items`);
  });

  it("evaluateBrowserLaunchReadiness: all pass = ready", () => {
    const allPass = BROWSER_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: true,
      detail: "verified",
    }));
    const readiness = evaluateBrowserLaunchReadiness(allPass);
    assert.equal(readiness.ready, true);
  });

  it("evaluateBrowserLaunchReadiness: blocker fail = not ready", () => {
    const results = BROWSER_LAUNCH_BLOCKERS.map((b) => ({
      blockerId: b.id,
      passed: b.severity !== "blocker",
      detail: "test",
    }));
    const readiness = evaluateBrowserLaunchReadiness(results);
    assert.equal(readiness.ready, false);
  });
});
