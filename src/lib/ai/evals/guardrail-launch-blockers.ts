// ---------------------------------------------------------------------------
// Phase 7.1.4: Guardrail Launch Blockers
// Defines conditions that must pass before guardrails ship broadly.
// ---------------------------------------------------------------------------

export interface LaunchBlocker {
  id: string;
  severity: "blocker" | "warning";
  category: "detection" | "safety" | "observability" | "config" | "resilience";
  description: string;
  verification: string;
}

export interface LaunchReadiness {
  ready: boolean;
  blockersPassing: number;
  blockersTotal: number;
  warningsPassing: number;
  warningsTotal: number;
  results: Array<{
    blocker: LaunchBlocker;
    passed: boolean;
    detail: string;
  }>;
}

// ---------------------------------------------------------------------------
// Blockers
// ---------------------------------------------------------------------------

export const LAUNCH_BLOCKERS: LaunchBlocker[] = [
  // --- Detection ---
  {
    id: "identical-loop-detection",
    severity: "blocker",
    category: "detection",
    description: "Identical tool call loop detection triggers at configured threshold",
    verification: "guardrails.test.ts: 'halts at hard stop threshold'",
  },
  {
    id: "no-progress-detection",
    severity: "blocker",
    category: "detection",
    description: "No-progress pattern (same tool + args + result) is detected",
    verification: "guardrails.test.ts: 'halts on no-progress hard stop'",
  },
  {
    id: "ping-pong-detection",
    severity: "blocker",
    category: "detection",
    description: "Ping-pong tool alternation pattern (A→B→A→B) is detected",
    verification: "guardrails.test.ts: 'detects A→B→A→B alternation pattern'",
  },
  {
    id: "delegation-recursion-detection",
    severity: "blocker",
    category: "detection",
    description: "Circular delegation chains are detected and halted",
    verification: "guardrails.test.ts: 'detects direct circular delegation'",
  },
  {
    id: "browser-no-progress-detection",
    severity: "blocker",
    category: "detection",
    description: "Repeated browser actions with no page-state change are detected",
    verification: "guardrails.test.ts: 'halts after N consecutive no-change browser actions'",
  },

  // --- Safety ---
  {
    id: "injection-scanning",
    severity: "blocker",
    category: "safety",
    description: "Prompt injection patterns in web_fetch/web_search results are flagged",
    verification: "guardrail-middleware.test.ts: injection scanner tests",
  },
  {
    id: "budget-spend-enforcement",
    severity: "blocker",
    category: "safety",
    description: "Spend budget halts runs before exceeding cost threshold",
    verification: "guardrails.test.ts: 'halts when spend budget is exceeded'",
  },
  {
    id: "budget-token-enforcement",
    severity: "blocker",
    category: "safety",
    description: "Token budget halts runs before exceeding token threshold",
    verification: "guardrails.test.ts: 'halts when token budget is exceeded'",
  },
  {
    id: "rate-limit-web-fetch",
    severity: "blocker",
    category: "safety",
    description: "web_fetch per-run rate limit prevents unbounded fetching",
    verification: "guardrail-middleware.test.ts: 'halts when web_fetch exceeds per-run limit'",
  },
  {
    id: "rate-limit-delegation-fanout",
    severity: "blocker",
    category: "safety",
    description: "Delegation fan-out limit prevents unbounded child runs",
    verification: "guardrail-middleware.test.ts: 'halts when delegation fan-out exceeded'",
  },

  // --- Observability ---
  {
    id: "events-persisted",
    severity: "blocker",
    category: "observability",
    description: "Guardrail events are persisted to tenant_guardrail_events table",
    verification: "unified-tool-executor.ts: flush logic writes guardrail events",
  },
  {
    id: "trace-includes-guardrail-summary",
    severity: "blocker",
    category: "observability",
    description: "Conversation traces include guardrail summary with event details",
    verification: "trace-recorder.ts: GuardrailSummary includes events array",
  },
  {
    id: "admin-dashboard-displays-events",
    severity: "blocker",
    category: "observability",
    description: "Admin guardrail dashboard shows events with new Phase 6 kinds",
    verification: "guardrail-events-panel.tsx: KIND_LABELS includes all event kinds",
  },

  // --- Config ---
  {
    id: "per-tenant-overrides",
    severity: "blocker",
    category: "config",
    description: "Guardrail thresholds can be overridden per tenant",
    verification: "guardrail-config-loader.ts: loadGuardrailConfig with tenant_id",
  },
  {
    id: "per-agent-overrides",
    severity: "warning",
    category: "config",
    description: "Guardrail thresholds can be overridden per agent within a tenant",
    verification: "guardrail-config-loader.ts: loadGuardrailConfig with agent_id",
  },
  {
    id: "adaptive-thresholds",
    severity: "warning",
    category: "config",
    description: "Retry-allowed tools get relaxed loop thresholds",
    verification: "guardrails.test.ts: 'doubles loop thresholds for retry-allowed tools'",
  },

  // --- Resilience ---
  {
    id: "halt-prevents-further-calls",
    severity: "blocker",
    category: "resilience",
    description: "Once halted, no further tool invocations are allowed",
    verification: "guardrails.test.ts: 'blocks further invocations after halt'",
  },
  {
    id: "operator-can-terminate-run",
    severity: "warning",
    category: "resilience",
    description: "Operators can terminate running/queued runs from admin UI",
    verification: "POST /api/admin/runs/{runId} with action=terminate",
  },
  {
    id: "operator-can-replay-run",
    severity: "warning",
    category: "resilience",
    description: "Operators can replay failed runs from admin UI",
    verification: "POST /api/admin/runs/{runId} with action=replay",
  },
];

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export function evaluateLaunchReadiness(
  results: Array<{ blockerId: string; passed: boolean; detail: string }>
): LaunchReadiness {
  const matched = results.map((r) => ({
    blocker: LAUNCH_BLOCKERS.find((b) => b.id === r.blockerId)!,
    passed: r.passed,
    detail: r.detail,
  }));

  const blockers = matched.filter((m) => m.blocker?.severity === "blocker");
  const warnings = matched.filter((m) => m.blocker?.severity === "warning");

  return {
    ready: blockers.every((b) => b.passed),
    blockersPassing: blockers.filter((b) => b.passed).length,
    blockersTotal: blockers.length,
    warningsPassing: warnings.filter((w) => w.passed).length,
    warningsTotal: warnings.length,
    results: matched,
  };
}
