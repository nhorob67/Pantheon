// ---------------------------------------------------------------------------
// Phase 7.1.2: Delegation Launch Blockers
// ---------------------------------------------------------------------------

export interface LaunchBlocker {
  id: string;
  severity: "blocker" | "warning";
  category: "sync" | "async" | "safety" | "observability" | "budget";
  description: string;
  verification: string;
}

export const DELEGATION_LAUNCH_BLOCKERS: LaunchBlocker[] = [
  // --- Sync ---
  {
    id: "sync-delegation-executes",
    severity: "blocker",
    category: "sync",
    description: "Sync delegation creates child run, executes, and returns result to parent",
    verification: "delegation.test.ts: sync execution tests",
  },
  {
    id: "sync-self-delegation-blocked",
    severity: "blocker",
    category: "sync",
    description: "Agent cannot delegate to itself",
    verification: "delegation.test.ts: self-delegation test",
  },
  {
    id: "sync-target-validation",
    severity: "blocker",
    category: "sync",
    description: "Target agent must be active and have can_receive_delegation=true",
    verification: "delegation.test.ts: target validation tests",
  },
  {
    id: "sync-child-error-propagation",
    severity: "blocker",
    category: "sync",
    description: "Child run failures propagate error message to parent agent",
    verification: "delegation.test.ts: child failure propagation",
  },

  // --- Async ---
  {
    id: "async-delegation-enqueues",
    severity: "blocker",
    category: "async",
    description: "Async delegation creates queued child run and returns delegation ID",
    verification: "async-delegation.test.ts: enqueue tests",
  },
  {
    id: "async-poll-returns-status",
    severity: "blocker",
    category: "async",
    description: "Poll returns current status and result when completed",
    verification: "async-delegation.test.ts: poll tests",
  },
  {
    id: "async-cancel-works",
    severity: "blocker",
    category: "async",
    description: "Cancel marks delegation as canceled and prevents further execution",
    verification: "async-delegation.test.ts: cancel tests",
  },
  {
    id: "async-deadline-enforcement",
    severity: "warning",
    category: "async",
    description: "Expired deadlines are detected on poll and auto-canceled",
    verification: "async-delegation.test.ts: deadline timeout tests",
  },

  // --- Safety ---
  {
    id: "delegation-depth-limit",
    severity: "blocker",
    category: "safety",
    description: "Delegation tool is not created when at or above max depth",
    verification: "delegation.test.ts: depth limit tests",
  },
  {
    id: "delegation-recursion-detection",
    severity: "blocker",
    category: "safety",
    description: "Circular delegation chains are detected by guardrails",
    verification: "guardrails.test.ts: delegation recursion tests",
  },
  {
    id: "delegation-fan-out-limit",
    severity: "blocker",
    category: "safety",
    description: "Fan-out limit prevents unbounded concurrent async children",
    verification: "async-delegation.test.ts: fan-out limit tests",
  },
  {
    id: "delegation-permission-narrowing",
    severity: "blocker",
    category: "safety",
    description: "Child tools are narrowed to intersection of parent's available tools",
    verification: "delegation.test.ts: permission narrowing tests",
  },

  // --- Observability ---
  {
    id: "delegation-child-run-recorded",
    severity: "blocker",
    category: "observability",
    description: "Child runs are recorded in tenant_runtime_runs with parent_run_id",
    verification: "delegation.ts: child run record creation",
  },
  {
    id: "delegation-trace-visible",
    severity: "blocker",
    category: "observability",
    description: "Delegation events appear in conversation traces",
    verification: "trace-recorder.ts: extractDelegationEvents",
  },
  {
    id: "delegation-tree-in-inspector",
    severity: "warning",
    category: "observability",
    description: "Delegation tree is visible in admin run inspector",
    verification: "run-inspector.tsx: DelegationTreeNodeRow component",
  },

  // --- Budget ---
  {
    id: "delegation-budget-inheritance",
    severity: "blocker",
    category: "budget",
    description: "Child budget is reduced based on parent's current usage",
    verification: "delegation.ts: adjustChildBudget function",
  },
  {
    id: "delegation-token-deduction",
    severity: "blocker",
    category: "budget",
    description: "Child token usage is deducted from parent's guardrail budget",
    verification: "delegation.ts: parentGuardrails.recordTokenUsage",
  },
];

export interface LaunchReadiness {
  ready: boolean;
  blockersPassing: number;
  blockersTotal: number;
  warningsPassing: number;
  warningsTotal: number;
  results: Array<{ blocker: LaunchBlocker; passed: boolean; detail: string }>;
}

export function evaluateDelegationLaunchReadiness(
  results: Array<{ blockerId: string; passed: boolean; detail: string }>
): LaunchReadiness {
  const matched = results.map((r) => ({
    blocker: DELEGATION_LAUNCH_BLOCKERS.find((b) => b.id === r.blockerId)!,
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
