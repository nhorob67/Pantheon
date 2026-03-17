// ---------------------------------------------------------------------------
// Phase 1.5 + Phase 6: Guardrails — Loop Detection, Run Budgets,
// Ping-Pong Detection, Browser No-Progress, Delegation Recursion
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface GuardrailConfig {
  /**
   * Number of identical tool calls (same name + same args hash) before
   * a warning is logged. Set to 0 to disable warning-only threshold.
   */
  loopWarningThreshold: number;

  /**
   * Number of identical tool calls before the run is halted.
   * Must be >= loopWarningThreshold when both are > 0.
   */
  loopHardStopThreshold: number;

  /**
   * Maximum total tool invocations per run.
   */
  maxToolInvocations: number;

  /**
   * Maximum elapsed wall-clock time for a run (ms).
   */
  maxElapsedMs: number;

  /**
   * Maximum total tokens (input + output) per run.
   */
  maxTokens: number;

  /**
   * Maximum estimated spend in cents per run.
   */
  maxSpendCents: number;

  /**
   * Maximum browser actions per run (defaults to 25).
   */
  maxBrowserActions: number;

  /**
   * Maximum browser session duration in ms (defaults to 120000).
   */
  maxBrowserSessionMs: number;

  // --- Phase 6: Advanced loop detection ---

  /**
   * Number of ping-pong alternations (A→B→A→B) before halt.
   * Set to 0 to disable. Defaults to 4 full cycles.
   */
  pingPongThreshold: number;

  /**
   * Number of consecutive browser actions with no page-state change
   * (same URL + same snapshot hash) before halt.
   * Set to 0 to disable. Defaults to 5.
   */
  browserNoProgressThreshold: number;

  /**
   * Maximum delegation depth before halting for recursion.
   * Protects against A→B→C→A circular chains.
   * Set to 0 to disable. Defaults to 5.
   */
  maxDelegationDepth: number;

  /**
   * Tool names that are allowed higher loop thresholds because
   * they legitimately retry with varying inputs (e.g. http_request).
   * The loop thresholds are doubled for tools in this list.
   */
  retryAllowedTools: string[];
}

/** Sensible defaults that prevent runaway behavior without breaking normal usage. */
export const DEFAULT_GUARDRAIL_CONFIG: Readonly<GuardrailConfig> = {
  loopWarningThreshold: 3,
  loopHardStopThreshold: 5,
  maxToolInvocations: 50,
  maxElapsedMs: 5 * 60 * 1000, // 5 minutes
  maxTokens: 200_000,
  maxSpendCents: 500, // $5.00
  maxBrowserActions: 25,
  maxBrowserSessionMs: 120_000,
  pingPongThreshold: 4,
  browserNoProgressThreshold: 5,
  maxDelegationDepth: 5,
  retryAllowedTools: [],
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type GuardrailEventKind =
  | "loop_warning"
  | "loop_hard_stop"
  | "budget_tool_invocations"
  | "budget_elapsed_time"
  | "budget_tokens"
  | "budget_spend"
  | "budget_browser_actions"
  | "budget_browser_session_time"
  // Phase 6: Advanced detection
  | "ping_pong_detected"
  | "browser_no_progress"
  | "delegation_recursion";

export interface GuardrailEvent {
  kind: GuardrailEventKind;
  toolName: string | null;
  threshold: number;
  actual: number;
  action: "warn" | "halt";
  message: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Loop Detection State
// ---------------------------------------------------------------------------

/**
 * Fingerprint a tool call for loop detection.
 * Uses tool name + a hash of the stringified args.
 */
function fingerprint(toolName: string, args: unknown): string {
  let argsStr: string;
  try {
    argsStr = JSON.stringify(args ?? {});
  } catch {
    argsStr = "{}";
  }
  // Simple FNV-1a-like hash for speed (no crypto needed)
  let hash = 2166136261;
  for (let i = 0; i < argsStr.length; i++) {
    hash ^= argsStr.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `${toolName}:${hash.toString(36)}`;
}

// ---------------------------------------------------------------------------
// No-Progress Detection
// ---------------------------------------------------------------------------

/**
 * Fingerprint a tool call including its result for no-progress detection.
 * Detects the pattern: same tool, same args, same result, repeated N times.
 */
function resultFingerprint(
  toolName: string,
  args: unknown,
  result: unknown
): string {
  let argsStr: string;
  let resultStr: string;
  try {
    argsStr = JSON.stringify(args ?? {});
  } catch {
    argsStr = "{}";
  }
  try {
    resultStr = JSON.stringify(result ?? {});
    if (resultStr.length > 500) resultStr = resultStr.slice(0, 500);
  } catch {
    resultStr = "{}";
  }
  let hash = 2166136261;
  const combined = `${toolName}:${argsStr}:${resultStr}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `noprog:${toolName}:${hash.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Guardrail Monitor
// ---------------------------------------------------------------------------

export interface GuardrailCheckResult {
  allowed: boolean;
  event: GuardrailEvent | null;
}

/**
 * Creates a guardrail monitor for a single run.
 *
 * Usage:
 *   const guard = createGuardrailMonitor(config, Date.now());
 *
 *   // Before each tool call:
 *   const pre = guard.checkBeforeInvocation(toolName, args);
 *   if (!pre.allowed) { /* halt run * / }
 *
 *   // After each tool call:
 *   const post = guard.checkAfterInvocation(toolName, args, result);
 *   if (!post.allowed) { /* halt run * / }
 *
 *   // After LLM response:
 *   guard.recordTokenUsage(inputTokens, outputTokens, costCents);
 */
/**
 * Delegation chain context passed in when the run is a child of a delegation.
 * Used to detect circular delegation patterns.
 */
export interface DelegationAncestry {
  /** Agent IDs from root to current, e.g. ["agentA", "agentB", "agentC"] */
  chain: string[];
}

export function createGuardrailMonitor(
  config: GuardrailConfig = DEFAULT_GUARDRAIL_CONFIG,
  runStartedAt: number = Date.now(),
  delegationAncestry?: DelegationAncestry
) {
  const callCounts = new Map<string, number>();
  const noProgressCounts = new Map<string, number>();
  let totalInvocations = 0;
  let totalTokens = 0;
  let totalSpendCents = 0;
  const events: GuardrailEvent[] = [];
  let halted = false;
  let haltReason: string | null = null;

  // Phase 6: Ping-pong detection — sliding window of recent tool names
  const recentToolNames: string[] = [];

  // Phase 6: Browser no-progress — track last browser state fingerprint
  let lastBrowserStateHash: string | null = null;
  let consecutiveBrowserNoProgress = 0;

  function pushEvent(event: GuardrailEvent): void {
    events.push(event);
    if (event.action === "halt") {
      halted = true;
      haltReason = event.message;
    }
  }

  /**
   * Check for ping-pong pattern: tool A and tool B alternating repeatedly.
   * Looks at the last 2*N entries in recentToolNames for [A,B,A,B,...] pattern.
   */
  function checkPingPong(toolName: string): GuardrailEvent | null {
    if (config.pingPongThreshold <= 0) return null;
    recentToolNames.push(toolName);

    // Need at least 2*threshold entries to detect threshold full cycles
    const windowSize = config.pingPongThreshold * 2;
    if (recentToolNames.length < windowSize) return null;

    const window = recentToolNames.slice(-windowSize);
    const a = window[0];
    const b = window[1];
    // Ping-pong requires two distinct tools
    if (a === b) return null;

    const isPingPong = window.every(
      (name, i) => name === (i % 2 === 0 ? a : b)
    );

    if (isPingPong) {
      const event: GuardrailEvent = {
        kind: "ping_pong_detected",
        toolName,
        threshold: config.pingPongThreshold,
        actual: config.pingPongThreshold,
        action: "halt",
        message: `Ping-pong pattern detected: "${a}" and "${b}" alternated ${config.pingPongThreshold} times. Halting run.`,
        timestamp: Date.now(),
      };
      pushEvent(event);
      return event;
    }
    return null;
  }

  /**
   * Effective loop thresholds for a tool, accounting for retry-allowed tools.
   */
  function effectiveLoopThresholds(toolName: string): {
    warn: number;
    halt: number;
  } {
    const isRetryAllowed = config.retryAllowedTools.includes(toolName);
    const multiplier = isRetryAllowed ? 2 : 1;
    return {
      warn: config.loopWarningThreshold * multiplier,
      halt: config.loopHardStopThreshold * multiplier,
    };
  }

  return {
    /** Whether the run has been halted by a guardrail. */
    get halted(): boolean {
      return halted;
    },

    /** The reason the run was halted, if any. */
    get haltReason(): string | null {
      return haltReason;
    },

    /** All guardrail events recorded during this run. */
    get events(): ReadonlyArray<GuardrailEvent> {
      return events;
    },

    /** Append an externally created event (e.g. from middleware hooks). */
    pushExternalEvent(event: GuardrailEvent): void {
      pushEvent(event);
    },

    /**
     * Check guardrails before executing a tool. Returns whether the
     * invocation should proceed.
     */
    checkBeforeInvocation(
      toolName: string,
      args: unknown
    ): GuardrailCheckResult {
      if (halted) {
        return {
          allowed: false,
          event: {
            kind: "loop_hard_stop",
            toolName,
            threshold: 0,
            actual: 0,
            action: "halt",
            message: `Run already halted: ${haltReason}`,
            timestamp: Date.now(),
          },
        };
      }

      // --- Tool invocation budget ---
      if (totalInvocations >= config.maxToolInvocations) {
        const event: GuardrailEvent = {
          kind: "budget_tool_invocations",
          toolName,
          threshold: config.maxToolInvocations,
          actual: totalInvocations + 1,
          action: "halt",
          message: `Run exceeded tool invocation budget (${config.maxToolInvocations} max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      // --- Elapsed time budget ---
      const elapsed = Date.now() - runStartedAt;
      if (elapsed >= config.maxElapsedMs) {
        const event: GuardrailEvent = {
          kind: "budget_elapsed_time",
          toolName,
          threshold: config.maxElapsedMs,
          actual: elapsed,
          action: "halt",
          message: `Run exceeded time budget (${Math.round(config.maxElapsedMs / 1000)}s max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      // --- Token budget ---
      if (totalTokens >= config.maxTokens) {
        const event: GuardrailEvent = {
          kind: "budget_tokens",
          toolName,
          threshold: config.maxTokens,
          actual: totalTokens,
          action: "halt",
          message: `Run exceeded token budget (${config.maxTokens} max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      // --- Spend budget ---
      if (totalSpendCents >= config.maxSpendCents) {
        const event: GuardrailEvent = {
          kind: "budget_spend",
          toolName,
          threshold: config.maxSpendCents,
          actual: totalSpendCents,
          action: "halt",
          message: `Run exceeded spend budget ($${(config.maxSpendCents / 100).toFixed(2)} max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      // --- Browser-specific budgets ---
      if (toolName.startsWith("browser_")) {
        const browserCalls = Array.from(callCounts.entries())
          .filter(([k]) => k.startsWith("browser_"))
          .reduce((sum, [, v]) => sum + v, 0);

        if (browserCalls >= config.maxBrowserActions) {
          const event: GuardrailEvent = {
            kind: "budget_browser_actions",
            toolName,
            threshold: config.maxBrowserActions,
            actual: browserCalls + 1,
            action: "halt",
            message: `Run exceeded browser action budget (${config.maxBrowserActions} max). Halting.`,
            timestamp: Date.now(),
          };
          pushEvent(event);
          return { allowed: false, event };
        }
      }

      // --- Ping-pong detection (Phase 6) ---
      const pingPongEvent = checkPingPong(toolName);
      if (pingPongEvent) {
        return { allowed: false, event: pingPongEvent };
      }

      // --- Loop detection (identical tool + args) ---
      const fp = fingerprint(toolName, args);
      const count = (callCounts.get(fp) ?? 0) + 1;
      callCounts.set(fp, count);
      totalInvocations++;

      const thresholds = effectiveLoopThresholds(toolName);

      if (thresholds.halt > 0 && count >= thresholds.halt) {
        const event: GuardrailEvent = {
          kind: "loop_hard_stop",
          toolName,
          threshold: thresholds.halt,
          actual: count,
          action: "halt",
          message: `Detected repeated identical call to "${toolName}" (${count}x, limit ${thresholds.halt}). Halting run.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      if (thresholds.warn > 0 && count === thresholds.warn) {
        const event: GuardrailEvent = {
          kind: "loop_warning",
          toolName,
          threshold: thresholds.warn,
          actual: count,
          action: "warn",
          message: `Tool "${toolName}" called ${count} times with identical args. May indicate a loop.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        // Warning only — still allowed
        return { allowed: true, event };
      }

      return { allowed: true, event: null };
    },

    /**
     * Check for no-progress patterns after a tool execution.
     * Detects same tool + same args + same result repeated.
     */
    checkAfterInvocation(
      toolName: string,
      args: unknown,
      result: unknown
    ): GuardrailCheckResult {
      if (halted) {
        return { allowed: false, event: null };
      }

      const rfp = resultFingerprint(toolName, args, result);
      const count = (noProgressCounts.get(rfp) ?? 0) + 1;
      noProgressCounts.set(rfp, count);

      const thresholds = effectiveLoopThresholds(toolName);

      if (thresholds.halt > 0 && count >= thresholds.halt) {
        const event: GuardrailEvent = {
          kind: "loop_hard_stop",
          toolName,
          threshold: thresholds.halt,
          actual: count,
          action: "halt",
          message: `No-progress pattern detected: "${toolName}" returned the same result ${count} times. Halting run.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      if (thresholds.warn > 0 && count === thresholds.warn) {
        const event: GuardrailEvent = {
          kind: "loop_warning",
          toolName,
          threshold: thresholds.warn,
          actual: count,
          action: "warn",
          message: `Tool "${toolName}" returned the same result ${count} times with identical args. Possible no-progress loop.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: true, event };
      }

      return { allowed: true, event: null };
    },

    /**
     * Phase 6: Check for browser no-progress — repeated browser actions with
     * no page-state change. Call after each browser_* tool invocation.
     *
     * @param pageUrl Current page URL after the action
     * @param snapshotDigest Hash or digest of the page snapshot/DOM state
     */
    checkBrowserProgress(
      toolName: string,
      pageUrl: string,
      snapshotDigest: string
    ): GuardrailCheckResult {
      if (halted) return { allowed: false, event: null };
      if (config.browserNoProgressThreshold <= 0) {
        return { allowed: true, event: null };
      }

      const stateHash = `${pageUrl}:${snapshotDigest}`;
      if (stateHash === lastBrowserStateHash) {
        consecutiveBrowserNoProgress++;
      } else {
        consecutiveBrowserNoProgress = 0;
        lastBrowserStateHash = stateHash;
      }

      if (consecutiveBrowserNoProgress >= config.browserNoProgressThreshold) {
        const event: GuardrailEvent = {
          kind: "browser_no_progress",
          toolName,
          threshold: config.browserNoProgressThreshold,
          actual: consecutiveBrowserNoProgress,
          action: "halt",
          message: `Browser performed ${consecutiveBrowserNoProgress} consecutive actions with no page-state change on ${pageUrl}. Halting run.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      return { allowed: true, event: null };
    },

    /**
     * Phase 6: Check for delegation recursion. Call before starting a
     * delegation to a target agent. Detects circular chains and max depth.
     *
     * @param targetAgentId The agent being delegated to
     */
    checkDelegationRecursion(targetAgentId: string): GuardrailCheckResult {
      if (halted) return { allowed: false, event: null };
      if (config.maxDelegationDepth <= 0 && !delegationAncestry) {
        return { allowed: true, event: null };
      }

      const chain = delegationAncestry?.chain ?? [];

      // Check circular: target already in ancestry chain
      if (chain.includes(targetAgentId)) {
        const cycle = [...chain, targetAgentId]
          .slice(chain.indexOf(targetAgentId))
          .join(" → ");
        const event: GuardrailEvent = {
          kind: "delegation_recursion",
          toolName: "delegate_task",
          threshold: 0,
          actual: chain.length + 1,
          action: "halt",
          message: `Delegation recursion detected: ${cycle}. Halting run.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      // Check max depth
      if (
        config.maxDelegationDepth > 0 &&
        chain.length >= config.maxDelegationDepth
      ) {
        const event: GuardrailEvent = {
          kind: "delegation_recursion",
          toolName: "delegate_task",
          threshold: config.maxDelegationDepth,
          actual: chain.length + 1,
          action: "halt",
          message: `Delegation depth limit exceeded (${chain.length + 1} > ${config.maxDelegationDepth}). Halting run.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return { allowed: false, event };
      }

      return { allowed: true, event: null };
    },

    /**
     * Record token usage and estimated cost after an LLM call.
     * Returns a halt event if budgets are exceeded.
     */
    recordTokenUsage(
      inputTokens: number,
      outputTokens: number,
      costCents: number = 0
    ): GuardrailEvent | null {
      totalTokens += inputTokens + outputTokens;
      totalSpendCents += costCents;

      if (totalTokens >= config.maxTokens) {
        const event: GuardrailEvent = {
          kind: "budget_tokens",
          toolName: null,
          threshold: config.maxTokens,
          actual: totalTokens,
          action: "halt",
          message: `Run exceeded token budget (${config.maxTokens} max, used ${totalTokens}). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return event;
      }

      if (totalSpendCents >= config.maxSpendCents) {
        const event: GuardrailEvent = {
          kind: "budget_spend",
          toolName: null,
          threshold: config.maxSpendCents,
          actual: totalSpendCents,
          action: "halt",
          message: `Run exceeded spend budget ($${(config.maxSpendCents / 100).toFixed(2)} max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return event;
      }

      return null;
    },

    recordDelegatedInvocations(count: number): GuardrailEvent | null {
      const normalizedCount = Math.max(0, Math.floor(count));
      if (normalizedCount <= 0) {
        return null;
      }

      totalInvocations += normalizedCount;

      if (totalInvocations >= config.maxToolInvocations) {
        const event: GuardrailEvent = {
          kind: "budget_tool_invocations",
          toolName: "delegate_task",
          threshold: config.maxToolInvocations,
          actual: totalInvocations,
          action: "halt",
          message: `Run exceeded tool invocation budget (${config.maxToolInvocations} max). Halting.`,
          timestamp: Date.now(),
        };
        pushEvent(event);
        return event;
      }

      return null;
    },

    /**
     * Get a summary of guardrail state for trace recording.
     */
    getSummary(): {
      totalInvocations: number;
      totalTokens: number;
      totalSpendCents: number;
      elapsedMs: number;
      halted: boolean;
      haltReason: string | null;
      eventCount: number;
      warningCount: number;
      haltCount: number;
    } {
      return {
        totalInvocations,
        totalTokens,
        totalSpendCents,
        elapsedMs: Date.now() - runStartedAt,
        halted,
        haltReason,
        eventCount: events.length,
        warningCount: events.filter((e) => e.action === "warn").length,
        haltCount: events.filter((e) => e.action === "halt").length,
      };
    },
  };
}

export type GuardrailMonitor = ReturnType<typeof createGuardrailMonitor>;
