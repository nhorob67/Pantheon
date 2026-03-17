// ---------------------------------------------------------------------------
// Phase 6.2: Guardrail Middleware Framework
// Composable pre/post-execution hooks for prompt injection scanning,
// escalation paths, and per-capability rate limits.
// ---------------------------------------------------------------------------

import type { GuardrailEventKind } from "./guardrails.ts";

// ---------------------------------------------------------------------------
// Verdict types
// ---------------------------------------------------------------------------

export type GuardrailAction =
  | "allow"
  | "warn"
  | "halt"
  | "escalate_approval"
  | "downgrade_capability";

export interface GuardrailVerdict {
  action: GuardrailAction;
  eventKind: GuardrailEventKind | "middleware_halt" | "injection_detected" | "rate_limit";
  toolName: string | null;
  message: string;
  /** Tools to remove from the active set when action is "downgrade_capability" */
  downgradeTools?: string[];
}

// ---------------------------------------------------------------------------
// Hook context
// ---------------------------------------------------------------------------

export interface GuardrailHookContext {
  /** The tool being invoked */
  toolName: string;
  /** Tool arguments (before execution) or result (after execution) */
  args: unknown;
  /** Tool result — only available in "after" phase */
  result?: unknown;
  /** Current run invocation count */
  totalInvocations: number;
  /** Per-tool invocation counts for the run */
  toolInvocationCounts: Map<string, number>;
  /** Timestamp tracking for rate limits */
  toolTimestamps: Map<string, number[]>;
}

// ---------------------------------------------------------------------------
// Hook definition
// ---------------------------------------------------------------------------

export interface GuardrailHook {
  name: string;
  phase: "before" | "after";
  /** Return null to allow, or a verdict to warn/halt/escalate */
  check(ctx: GuardrailHookContext): GuardrailVerdict | null;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface GuardrailPipelineResult {
  allowed: boolean;
  verdict: GuardrailVerdict | null;
  /** Warnings collected from hooks that returned "warn" */
  warnings: GuardrailVerdict[];
}

export interface GuardrailPipeline {
  runBefore(ctx: GuardrailHookContext): GuardrailPipelineResult;
  runAfter(ctx: GuardrailHookContext): GuardrailPipelineResult;
  hooks: ReadonlyArray<GuardrailHook>;
}

export function createGuardrailPipeline(
  hooks: GuardrailHook[]
): GuardrailPipeline {
  const beforeHooks = hooks.filter((h) => h.phase === "before");
  const afterHooks = hooks.filter((h) => h.phase === "after");

  function run(
    phaseHooks: GuardrailHook[],
    ctx: GuardrailHookContext
  ): GuardrailPipelineResult {
    const warnings: GuardrailVerdict[] = [];

    for (const hook of phaseHooks) {
      const verdict = hook.check(ctx);
      if (!verdict) continue;

      if (verdict.action === "warn") {
        warnings.push(verdict);
        continue;
      }

      // halt, escalate_approval, downgrade_capability all short-circuit
      return { allowed: false, verdict, warnings };
    }

    return { allowed: true, verdict: null, warnings };
  }

  return {
    runBefore: (ctx) => run(beforeHooks, ctx),
    runAfter: (ctx) => run(afterHooks, ctx),
    hooks,
  };
}

// ---------------------------------------------------------------------------
// Built-in hooks
// ---------------------------------------------------------------------------

// ---- Prompt injection scanner (post-execution) ----------------------------

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bignore (all |any |the )?(previous|prior|above) (instructions|prompts|directions)\b/i, label: "ignore_previous_instructions" },
  { pattern: /\b(system prompt|developer prompt|hidden prompt)\b/i, label: "prompt_reference" },
  { pattern: /\b(reveal|print|show|expose)\b.{0,40}\b(prompt|system|developer instructions)\b/i, label: "prompt_exfiltration" },
  { pattern: /<\s*\/?\s*(system|assistant|developer)\s*>/i, label: "role_tag_markup" },
  { pattern: /\byou are (chatgpt|an ai assistant|the system)\b/i, label: "role_redefinition" },
  { pattern: /\b(do not follow|disregard|override)\b.{0,40}\b(instructions|rules|policy)\b/i, label: "instruction_override" },
];

/** Applicable tool names for injection scanning */
const INJECTION_SCAN_TOOLS = new Set([
  "web_fetch",
  "web_search",
  "http_request",
  "browser_snapshot",
  "browser_evaluate",
]);

function collectStringsFromResult(value: unknown, limit: number = 20): string[] {
  const output: string[] = [];
  function walk(v: unknown): void {
    if (output.length >= limit) return;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length > 0) output.push(trimmed.slice(0, 2000));
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v === "object" && v !== null) {
      for (const item of Object.values(v as Record<string, unknown>)) walk(item);
    }
  }
  walk(value);
  return output;
}

export function createInjectionScannerHook(): GuardrailHook {
  return {
    name: "prompt_injection_scanner",
    phase: "after",
    check(ctx) {
      if (!INJECTION_SCAN_TOOLS.has(ctx.toolName)) return null;

      const texts = collectStringsFromResult(ctx.result);
      const matchedLabels: string[] = [];

      for (const text of texts) {
        for (const { pattern, label } of INJECTION_PATTERNS) {
          if (pattern.test(text)) {
            matchedLabels.push(label);
          }
        }
      }

      if (matchedLabels.length === 0) return null;

      const unique = [...new Set(matchedLabels)];
      return {
        action: "warn",
        eventKind: "injection_detected",
        toolName: ctx.toolName,
        message: `Potential prompt injection detected in ${ctx.toolName} result: ${unique.join(", ")}. Proceeding with caution.`,
      };
    },
  };
}

// ---- Per-capability rate limit hooks (pre-execution) ----------------------

export interface RateLimitConfig {
  /** Max calls to web_fetch per run */
  maxWebFetchPerRun: number;
  /** Max delegation fan-out (concurrent children) */
  maxDelegationFanOut: number;
  /** Max browser actions per minute */
  maxBrowserActionsPerMinute: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: Readonly<RateLimitConfig> = {
  maxWebFetchPerRun: 20,
  maxDelegationFanOut: 3,
  maxBrowserActionsPerMinute: 30,
};

export function createRateLimitHook(
  rateLimits: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): GuardrailHook {
  return {
    name: "per_capability_rate_limit",
    phase: "before",
    check(ctx) {
      // Web fetch rate limit
      if (ctx.toolName === "web_fetch") {
        const count = ctx.toolInvocationCounts.get("web_fetch") ?? 0;
        if (count >= rateLimits.maxWebFetchPerRun) {
          return {
            action: "halt",
            eventKind: "rate_limit",
            toolName: ctx.toolName,
            message: `web_fetch rate limit exceeded (${count}/${rateLimits.maxWebFetchPerRun} per run). Halting.`,
          };
        }
      }

      // Delegation fan-out limit
      if (
        ctx.toolName === "delegate_task" ||
        ctx.toolName === "delegate_task_async"
      ) {
        const syncCount =
          ctx.toolInvocationCounts.get("delegate_task") ?? 0;
        const asyncCount =
          ctx.toolInvocationCounts.get("delegate_task_async") ?? 0;
        const total = syncCount + asyncCount;
        if (total >= rateLimits.maxDelegationFanOut) {
          return {
            action: "halt",
            eventKind: "rate_limit",
            toolName: ctx.toolName,
            message: `Delegation fan-out limit exceeded (${total}/${rateLimits.maxDelegationFanOut} delegations). Halting.`,
          };
        }
      }

      // Browser actions per minute
      if (ctx.toolName.startsWith("browser_")) {
        const now = Date.now();
        const oneMinuteAgo = now - 60_000;
        const timestamps = ctx.toolTimestamps.get("__browser__") ?? [];
        const recentCount = timestamps.filter((t) => t >= oneMinuteAgo).length;
        if (recentCount >= rateLimits.maxBrowserActionsPerMinute) {
          return {
            action: "halt",
            eventKind: "rate_limit",
            toolName: ctx.toolName,
            message: `Browser action rate limit exceeded (${recentCount}/${rateLimits.maxBrowserActionsPerMinute} per minute). Halting.`,
          };
        }
        // Track the timestamp
        timestamps.push(now);
        ctx.toolTimestamps.set("__browser__", timestamps);
      }

      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Convenience: create a default pipeline with all built-in hooks
// ---------------------------------------------------------------------------

export function createDefaultGuardrailPipeline(
  rateLimits?: Partial<RateLimitConfig>
): GuardrailPipeline {
  return createGuardrailPipeline([
    createRateLimitHook({ ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimits }),
    createInjectionScannerHook(),
  ]);
}
