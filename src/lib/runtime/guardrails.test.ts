import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGuardrailMonitor,
  DEFAULT_GUARDRAIL_CONFIG,
  type GuardrailConfig,
  type DelegationAncestry,
} from "./guardrails.ts";

function config(overrides?: Partial<GuardrailConfig>): GuardrailConfig {
  return { ...DEFAULT_GUARDRAIL_CONFIG, ...overrides };
}

describe("guardrails", () => {
  // -----------------------------------------------------------------------
  // Loop detection
  // -----------------------------------------------------------------------

  describe("loop detection", () => {
    it("warns at threshold for identical calls", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 4 })
      );

      // Call 1 — fine
      const r1 = guard.checkBeforeInvocation("memory_search", { query: "test" });
      assert.equal(r1.allowed, true);
      assert.equal(r1.event, null);

      // Call 2 — warning
      const r2 = guard.checkBeforeInvocation("memory_search", { query: "test" });
      assert.equal(r2.allowed, true);
      assert.equal(r2.event?.kind, "loop_warning");
      assert.equal(r2.event?.action, "warn");
    });

    it("halts at hard stop threshold", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 3 })
      );

      guard.checkBeforeInvocation("memory_search", { query: "test" });
      guard.checkBeforeInvocation("memory_search", { query: "test" });

      const r3 = guard.checkBeforeInvocation("memory_search", { query: "test" });
      assert.equal(r3.allowed, false);
      assert.equal(r3.event?.kind, "loop_hard_stop");
      assert.equal(guard.halted, true);
    });

    it("treats different args as different calls", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 3 })
      );

      guard.checkBeforeInvocation("memory_search", { query: "alpha" });
      guard.checkBeforeInvocation("memory_search", { query: "beta" });
      guard.checkBeforeInvocation("memory_search", { query: "gamma" });

      // All different args — no loop
      assert.equal(guard.halted, false);
      assert.equal(guard.events.length, 0);
    });

    it("treats different tool names as different calls", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 3 })
      );

      guard.checkBeforeInvocation("memory_search", { query: "test" });
      guard.checkBeforeInvocation("memory_write", { query: "test" });
      guard.checkBeforeInvocation("schedule_list", { query: "test" });

      assert.equal(guard.halted, false);
    });

    it("blocks further invocations after halt", () => {
      const guard = createGuardrailMonitor(
        config({ loopHardStopThreshold: 1 })
      );

      // First call hits the hard stop immediately
      const r1 = guard.checkBeforeInvocation("tool_a", {});
      assert.equal(r1.allowed, false);

      // Subsequent call also blocked
      const r2 = guard.checkBeforeInvocation("tool_b", {});
      assert.equal(r2.allowed, false);
    });
  });

  // -----------------------------------------------------------------------
  // No-progress detection
  // -----------------------------------------------------------------------

  describe("no-progress detection", () => {
    it("detects repeated same-result patterns", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 4 })
      );

      const args = { query: "status" };
      const result = { status: "pending" };

      // First 3 calls with different args to avoid pre-invocation loop detection
      for (let i = 0; i < 2; i++) {
        guard.checkBeforeInvocation("check_status", { query: "status", i });
        const r = guard.checkAfterInvocation("check_status", args, result);
        if (i === 1) {
          assert.equal(r.event?.kind, "loop_warning");
        }
      }
    });

    it("halts on no-progress hard stop", () => {
      const guard = createGuardrailMonitor(
        config({
          loopWarningThreshold: 0, // disable warnings
          loopHardStopThreshold: 3,
          maxToolInvocations: 100,
        })
      );

      const args = { url: "https://example.com" };
      const result = { body: "loading..." };

      for (let i = 0; i < 2; i++) {
        guard.checkBeforeInvocation("web_fetch", { ...args, attempt: i });
        guard.checkAfterInvocation("web_fetch", args, result);
      }

      // Third time — halt
      guard.checkBeforeInvocation("web_fetch", { ...args, attempt: 2 });
      const r = guard.checkAfterInvocation("web_fetch", args, result);
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "loop_hard_stop");
      assert.equal(guard.halted, true);
    });
  });

  // -----------------------------------------------------------------------
  // Run budgets
  // -----------------------------------------------------------------------

  describe("run budgets", () => {
    it("halts when tool invocation budget is exceeded", () => {
      const guard = createGuardrailMonitor(
        config({ maxToolInvocations: 3, loopHardStopThreshold: 0 })
      );

      guard.checkBeforeInvocation("tool_a", { a: 1 });
      guard.checkBeforeInvocation("tool_b", { b: 2 });
      guard.checkBeforeInvocation("tool_c", { c: 3 });

      // 4th call — budget exceeded
      const r = guard.checkBeforeInvocation("tool_d", { d: 4 });
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "budget_tool_invocations");
    });

    it("halts when elapsed time budget is exceeded", () => {
      // Start the run 10 minutes ago
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const guard = createGuardrailMonitor(
        config({ maxElapsedMs: 5 * 60 * 1000 }),
        tenMinutesAgo
      );

      const r = guard.checkBeforeInvocation("tool_a", {});
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "budget_elapsed_time");
    });

    it("halts when token budget is exceeded via recordTokenUsage", () => {
      const guard = createGuardrailMonitor(config({ maxTokens: 1000 }));

      const event = guard.recordTokenUsage(800, 300, 10);
      assert.notEqual(event, null);
      assert.equal(event?.kind, "budget_tokens");
      assert.equal(guard.halted, true);
    });

    it("halts when spend budget is exceeded via recordTokenUsage", () => {
      const guard = createGuardrailMonitor(config({ maxSpendCents: 100 }));

      guard.recordTokenUsage(100, 100, 50);
      assert.equal(guard.halted, false);

      const event = guard.recordTokenUsage(100, 100, 60);
      assert.notEqual(event, null);
      assert.equal(event?.kind, "budget_spend");
      assert.equal(guard.halted, true);
    });

    it("does not halt when within budget", () => {
      const guard = createGuardrailMonitor(
        config({ maxToolInvocations: 10, maxTokens: 100_000, maxSpendCents: 500 })
      );

      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.recordTokenUsage(5000, 3000, 50);

      assert.equal(guard.halted, false);
      assert.equal(guard.events.length, 0);
    });
  });

  // -----------------------------------------------------------------------
  // Phase 6: Ping-pong detection
  // -----------------------------------------------------------------------

  describe("ping-pong detection", () => {
    it("detects A→B→A→B alternation pattern", () => {
      const guard = createGuardrailMonitor(
        config({
          pingPongThreshold: 2, // 2 full cycles = A,B,A,B
          loopHardStopThreshold: 0, // disable normal loop detection
        })
      );

      const r1 = guard.checkBeforeInvocation("tool_a", { x: 1 });
      assert.equal(r1.allowed, true);

      const r2 = guard.checkBeforeInvocation("tool_b", { y: 2 });
      assert.equal(r2.allowed, true);

      const r3 = guard.checkBeforeInvocation("tool_a", { x: 3 });
      assert.equal(r3.allowed, true);

      // 4th call completes 2 full cycles: [A, B, A, B]
      const r4 = guard.checkBeforeInvocation("tool_b", { y: 4 });
      assert.equal(r4.allowed, false);
      assert.equal(r4.event?.kind, "ping_pong_detected");
      assert.ok(r4.event?.message.includes("tool_a"));
      assert.ok(r4.event?.message.includes("tool_b"));
    });

    it("does not trigger for non-alternating patterns", () => {
      const guard = createGuardrailMonitor(
        config({
          pingPongThreshold: 2,
          loopHardStopThreshold: 0,
          maxToolInvocations: 100,
        })
      );

      // A, B, C, A, B, C — not ping-pong
      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.checkBeforeInvocation("tool_c", {});
      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.checkBeforeInvocation("tool_c", {});

      assert.equal(guard.halted, false);
      const ppEvents = guard.events.filter(
        (e) => e.kind === "ping_pong_detected"
      );
      assert.equal(ppEvents.length, 0);
    });

    it("does not trigger when same tool is called repeatedly (not ping-pong)", () => {
      const guard = createGuardrailMonitor(
        config({
          pingPongThreshold: 2,
          loopHardStopThreshold: 0,
          maxToolInvocations: 100,
        })
      );

      // A, A, A, A — not ping-pong (same tool, not two distinct tools)
      guard.checkBeforeInvocation("tool_a", { i: 1 });
      guard.checkBeforeInvocation("tool_a", { i: 2 });
      guard.checkBeforeInvocation("tool_a", { i: 3 });
      guard.checkBeforeInvocation("tool_a", { i: 4 });

      const ppEvents = guard.events.filter(
        (e) => e.kind === "ping_pong_detected"
      );
      assert.equal(ppEvents.length, 0);
    });

    it("disabled when threshold is 0", () => {
      const guard = createGuardrailMonitor(
        config({
          pingPongThreshold: 0,
          loopHardStopThreshold: 0,
          maxToolInvocations: 100,
        })
      );

      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});

      assert.equal(guard.halted, false);
    });

    it("detects ping-pong after other tools have been called", () => {
      const guard = createGuardrailMonitor(
        config({
          pingPongThreshold: 3,
          loopHardStopThreshold: 0,
          maxToolInvocations: 100,
        })
      );

      // Some unrelated calls first
      guard.checkBeforeInvocation("setup_tool", {});
      guard.checkBeforeInvocation("init_tool", {});

      // Now ping-pong: 3 cycles = 6 calls
      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {});
      guard.checkBeforeInvocation("tool_a", {});
      const r = guard.checkBeforeInvocation("tool_b", {});

      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "ping_pong_detected");
    });
  });

  // -----------------------------------------------------------------------
  // Phase 6: Browser no-progress detection
  // -----------------------------------------------------------------------

  describe("browser no-progress detection", () => {
    it("halts after N consecutive no-change browser actions", () => {
      const guard = createGuardrailMonitor(
        config({ browserNoProgressThreshold: 3 })
      );

      const url = "https://example.com/page";
      const digest = "abc123";

      // First call sets the baseline
      const r1 = guard.checkBrowserProgress("browser_click", url, digest);
      assert.equal(r1.allowed, true);

      // 2nd same state
      const r2 = guard.checkBrowserProgress("browser_click", url, digest);
      assert.equal(r2.allowed, true);

      // 3rd same state
      const r3 = guard.checkBrowserProgress("browser_click", url, digest);
      assert.equal(r3.allowed, true);

      // 4th same state — threshold reached (3 consecutive no-progress)
      const r4 = guard.checkBrowserProgress("browser_click", url, digest);
      assert.equal(r4.allowed, false);
      assert.equal(r4.event?.kind, "browser_no_progress");
    });

    it("resets counter when page state changes", () => {
      const guard = createGuardrailMonitor(
        config({ browserNoProgressThreshold: 3 })
      );

      // 2 no-progress clicks
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash1");
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash1");

      // State changes — counter resets
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash2");

      // 2 more no-progress clicks (should not halt yet)
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash2");
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash2");

      assert.equal(guard.halted, false);
    });

    it("disabled when threshold is 0", () => {
      const guard = createGuardrailMonitor(
        config({ browserNoProgressThreshold: 0 })
      );

      for (let i = 0; i < 20; i++) {
        guard.checkBrowserProgress("browser_click", "https://a.com", "same");
      }

      assert.equal(guard.halted, false);
    });

    it("detects URL change as progress", () => {
      const guard = createGuardrailMonitor(
        config({ browserNoProgressThreshold: 2 })
      );

      guard.checkBrowserProgress("browser_navigate", "https://a.com", "hash1");
      guard.checkBrowserProgress("browser_click", "https://a.com", "hash1");

      // URL changed — progress
      guard.checkBrowserProgress("browser_click", "https://b.com", "hash1");
      guard.checkBrowserProgress("browser_click", "https://b.com", "hash1");

      // Only 1 no-progress so far (need 2 to halt)
      assert.equal(guard.halted, false);
    });
  });

  // -----------------------------------------------------------------------
  // Phase 6: Delegation recursion detection
  // -----------------------------------------------------------------------

  describe("delegation recursion detection", () => {
    it("detects direct circular delegation (A→B→A)", () => {
      const ancestry: DelegationAncestry = {
        chain: ["agentA", "agentB"],
      };

      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 10 }),
        Date.now(),
        ancestry
      );

      const r = guard.checkDelegationRecursion("agentA");
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "delegation_recursion");
      assert.ok(r.event?.message.includes("agentA → agentB → agentA"));
    });

    it("detects indirect circular delegation (A→B→C→A)", () => {
      const ancestry: DelegationAncestry = {
        chain: ["agentA", "agentB", "agentC"],
      };

      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 10 }),
        Date.now(),
        ancestry
      );

      const r = guard.checkDelegationRecursion("agentA");
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "delegation_recursion");
      assert.ok(r.event?.message.includes("recursion"));
    });

    it("halts when delegation depth limit exceeded", () => {
      const ancestry: DelegationAncestry = {
        chain: ["a1", "a2", "a3", "a4", "a5"],
      };

      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 5 }),
        Date.now(),
        ancestry
      );

      // Chain is already 5 deep, delegating to a new agent exceeds limit
      const r = guard.checkDelegationRecursion("a6");
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "delegation_recursion");
      assert.ok(r.event?.message.includes("depth limit"));
    });

    it("allows delegation within depth limit", () => {
      const ancestry: DelegationAncestry = {
        chain: ["agentA", "agentB"],
      };

      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 5 }),
        Date.now(),
        ancestry
      );

      const r = guard.checkDelegationRecursion("agentC");
      assert.equal(r.allowed, true);
      assert.equal(r.event, null);
    });

    it("allows delegation with no ancestry context", () => {
      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 5 })
      );

      const r = guard.checkDelegationRecursion("agentB");
      assert.equal(r.allowed, true);
    });

    it("detects mid-chain circular (A→B→C→B)", () => {
      const ancestry: DelegationAncestry = {
        chain: ["agentA", "agentB", "agentC"],
      };

      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 10 }),
        Date.now(),
        ancestry
      );

      const r = guard.checkDelegationRecursion("agentB");
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "delegation_recursion");
      assert.ok(r.event?.message.includes("agentB → agentC → agentB"));
    });

    it("disabled when maxDelegationDepth is 0 and no ancestry", () => {
      const guard = createGuardrailMonitor(
        config({ maxDelegationDepth: 0 })
      );

      const r = guard.checkDelegationRecursion("agentX");
      assert.equal(r.allowed, true);
    });
  });

  // -----------------------------------------------------------------------
  // Phase 6: Adaptive thresholds (retry-allowed tools)
  // -----------------------------------------------------------------------

  describe("adaptive thresholds", () => {
    it("doubles loop thresholds for retry-allowed tools", () => {
      const guard = createGuardrailMonitor(
        config({
          loopWarningThreshold: 3,
          loopHardStopThreshold: 5,
          retryAllowedTools: ["http_request"],
        })
      );

      // http_request gets 2x thresholds: warn at 6, halt at 10
      const args = { url: "https://api.example.com", method: "GET" };
      for (let i = 0; i < 5; i++) {
        const r = guard.checkBeforeInvocation("http_request", args);
        assert.equal(r.allowed, true, `call ${i + 1} should be allowed`);
      }

      // Call 6 should warn (2x * 3 = 6)
      const r6 = guard.checkBeforeInvocation("http_request", args);
      assert.equal(r6.allowed, true);
      assert.equal(r6.event?.kind, "loop_warning");

      // Continue to call 10 — should halt (2x * 5 = 10)
      for (let i = 7; i < 10; i++) {
        guard.checkBeforeInvocation("http_request", args);
      }
      const r10 = guard.checkBeforeInvocation("http_request", args);
      assert.equal(r10.allowed, false);
      assert.equal(r10.event?.kind, "loop_hard_stop");
    });

    it("uses normal thresholds for non-retry-allowed tools", () => {
      const guard = createGuardrailMonitor(
        config({
          loopWarningThreshold: 2,
          loopHardStopThreshold: 3,
          retryAllowedTools: ["http_request"],
        })
      );

      // memory_search is NOT in retry-allowed, so normal thresholds apply
      guard.checkBeforeInvocation("memory_search", { q: "test" });
      const r2 = guard.checkBeforeInvocation("memory_search", { q: "test" });
      assert.equal(r2.event?.kind, "loop_warning"); // warn at 2

      const r3 = guard.checkBeforeInvocation("memory_search", { q: "test" });
      assert.equal(r3.allowed, false); // halt at 3
    });

    it("applies adaptive thresholds to no-progress detection too", () => {
      const guard = createGuardrailMonitor(
        config({
          loopWarningThreshold: 0,
          loopHardStopThreshold: 3,
          retryAllowedTools: ["http_request"],
          maxToolInvocations: 100,
        })
      );

      // http_request gets 2x: halt at 6 for no-progress
      const args = { url: "https://api.example.com" };
      const result = { status: 503 };

      for (let i = 0; i < 5; i++) {
        guard.checkBeforeInvocation("http_request", { ...args, attempt: i });
        const r = guard.checkAfterInvocation("http_request", args, result);
        assert.equal(r.allowed, true, `no-progress call ${i + 1} should be allowed`);
      }

      // 6th time — halt
      guard.checkBeforeInvocation("http_request", { ...args, attempt: 5 });
      const r = guard.checkAfterInvocation("http_request", args, result);
      assert.equal(r.allowed, false);
      assert.equal(r.event?.kind, "loop_hard_stop");
    });
  });

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  describe("summary", () => {
    it("returns accurate summary", () => {
      const guard = createGuardrailMonitor(
        config({ loopWarningThreshold: 2, loopHardStopThreshold: 10 })
      );

      guard.checkBeforeInvocation("tool_a", { x: 1 });
      guard.checkBeforeInvocation("tool_a", { x: 1 }); // triggers warning
      guard.recordTokenUsage(1000, 500, 10);

      const summary = guard.getSummary();
      assert.equal(summary.totalInvocations, 2);
      assert.equal(summary.totalTokens, 1500);
      assert.equal(summary.totalSpendCents, 10);
      assert.equal(summary.halted, false);
      assert.equal(summary.eventCount, 1);
      assert.equal(summary.warningCount, 1);
      assert.equal(summary.haltCount, 0);
    });

    it("includes halt info when halted", () => {
      const guard = createGuardrailMonitor(
        config({ maxToolInvocations: 1, loopHardStopThreshold: 0 })
      );

      guard.checkBeforeInvocation("tool_a", {});
      guard.checkBeforeInvocation("tool_b", {}); // budget exceeded

      const summary = guard.getSummary();
      assert.equal(summary.halted, true);
      assert.ok(summary.haltReason?.includes("tool invocation budget"));
      assert.equal(summary.haltCount, 1);
    });
  });

  // -----------------------------------------------------------------------
  // Default config
  // -----------------------------------------------------------------------

  describe("defaults", () => {
    it("has sensible default values", () => {
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.loopWarningThreshold, 3);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.loopHardStopThreshold, 5);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.maxToolInvocations, 50);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.maxElapsedMs, 300_000);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.maxTokens, 200_000);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.maxSpendCents, 500);
    });

    it("has Phase 6 default values", () => {
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.pingPongThreshold, 4);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.browserNoProgressThreshold, 5);
      assert.equal(DEFAULT_GUARDRAIL_CONFIG.maxDelegationDepth, 5);
      assert.deepEqual(DEFAULT_GUARDRAIL_CONFIG.retryAllowedTools, []);
    });
  });
});
