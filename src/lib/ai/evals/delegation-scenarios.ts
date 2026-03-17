// ---------------------------------------------------------------------------
// Phase 7.1.2: Delegation Eval Scenarios
// Covers sync and async delegation: happy paths, depth limits, recursion,
// child failure, fan-out limits, budget inheritance, and permission narrowing.
// ---------------------------------------------------------------------------

export interface DelegationEvalScenario {
  id: string;
  category:
    | "sync_happy_path"
    | "async_happy_path"
    | "depth_limit"
    | "recursion"
    | "child_failure"
    | "fan_out"
    | "budget_inheritance"
    | "permission_narrowing";
  description: string;
  setup: DelegationSetup;
  expected: DelegationExpectedOutcome;
}

export interface DelegationSetup {
  parentAgent: { id: string; name: string; canDelegate: boolean };
  targetAgent: {
    id: string;
    name: string;
    role: string;
    canReceive: boolean;
    active: boolean;
  };
  currentDepth: number;
  maxDepth: number;
  /** For async: concurrent active delegations */
  activeDelegations?: number;
  maxFanOut?: number;
  /** Parent's current budget usage */
  parentBudgetUsed?: { tokens: number; invocations: number; spendCents: number };
  /** Parent's total budget */
  parentBudgetMax?: { tokens: number; invocations: number; spendCents: number };
  /** Parent's available tool keys (for narrowing) */
  parentToolKeys?: string[];
  /** Child's raw tool keys before narrowing */
  childToolKeys?: string[];
  /** Mock child execution result */
  childResult?: { success: boolean; result?: string; error?: string; tokensUsed?: number };
  task: string;
  isAsync?: boolean;
  deadlineMinutes?: number;
}

export interface DelegationExpectedOutcome {
  success: boolean;
  errorType?: string;
  /** Whether child run record should be created */
  childRunCreated?: boolean;
  /** Expected delegation depth of child */
  childDepth?: number;
  /** Expected narrowed tool count */
  narrowedToolCount?: number;
  /** Whether parent budget is reduced */
  parentBudgetReduced?: boolean;
  /** For async: expected status */
  asyncStatus?: "queued" | "completed" | "failed" | "canceled";
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const DELEGATION_EVAL_SCENARIOS: DelegationEvalScenario[] = [
  // --- Sync happy path ---
  {
    id: "sync-delegation-success",
    category: "sync_happy_path",
    description: "Agent A delegates task to Agent B and receives result",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Research Assistant", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Research the latest pricing for competitor X",
      childResult: { success: true, result: "Competitor X charges $49/mo", tokensUsed: 1500 },
    },
    expected: {
      success: true,
      childRunCreated: true,
      childDepth: 1,
      parentBudgetReduced: true,
    },
  },
  {
    id: "sync-delegation-cannot-delegate",
    category: "sync_happy_path",
    description: "Agent with canDelegate=false gets no delegation tool",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: false },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Helper", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Help me",
    },
    expected: {
      success: false,
      errorType: "tool_not_available",
    },
  },
  {
    id: "sync-delegation-self-delegation-blocked",
    category: "sync_happy_path",
    description: "Agent cannot delegate to itself",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-a", name: "Agent A", role: "Self", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Do my own work",
    },
    expected: {
      success: false,
      errorType: "self_delegation",
    },
  },

  // --- Async happy path ---
  {
    id: "async-delegation-enqueue",
    category: "async_happy_path",
    description: "Async delegation enqueues child run and returns delegation ID",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Worker", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Process this data in the background",
      isAsync: true,
      deadlineMinutes: 10,
      activeDelegations: 0,
      maxFanOut: 3,
    },
    expected: {
      success: true,
      childRunCreated: true,
      asyncStatus: "queued",
    },
  },
  {
    id: "async-delegation-poll-completed",
    category: "async_happy_path",
    description: "Polling a completed async delegation returns result",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Worker", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Background task",
      isAsync: true,
      childResult: { success: true, result: "Done", tokensUsed: 500 },
    },
    expected: {
      success: true,
      asyncStatus: "completed",
      parentBudgetReduced: true,
    },
  },

  // --- Depth limit ---
  {
    id: "delegation-depth-limit-reached",
    category: "depth_limit",
    description: "Delegation at max depth returns no tool",
    setup: {
      parentAgent: { id: "agent-c", name: "Agent C", canDelegate: true },
      targetAgent: { id: "agent-d", name: "Agent D", role: "Helper", canReceive: true, active: true },
      currentDepth: 3,
      maxDepth: 3,
      task: "Help me",
    },
    expected: {
      success: false,
      errorType: "depth_limit_reached",
    },
  },
  {
    id: "delegation-within-depth-limit",
    category: "depth_limit",
    description: "Delegation below max depth succeeds",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Helper", canReceive: true, active: true },
      currentDepth: 2,
      maxDepth: 3,
      task: "One more level",
      childResult: { success: true, result: "OK" },
    },
    expected: {
      success: true,
      childDepth: 3,
    },
  },

  // --- Recursion ---
  {
    id: "delegation-recursion-circular",
    category: "recursion",
    description: "Guardrails detect circular delegation A→B→A",
    setup: {
      parentAgent: { id: "agent-b", name: "Agent B", canDelegate: true },
      targetAgent: { id: "agent-a", name: "Agent A", role: "Original", canReceive: true, active: true },
      currentDepth: 1,
      maxDepth: 5,
      task: "Delegate back to originator",
    },
    expected: {
      success: false,
      errorType: "delegation_recursion",
    },
  },

  // --- Child failure ---
  {
    id: "delegation-child-failure-propagates",
    category: "child_failure",
    description: "Child run failure propagates error to parent",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Worker", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Try this risky operation",
      childResult: { success: false, error: "Tool execution failed: API returned 500" },
    },
    expected: {
      success: false,
      errorType: "child_execution_failed",
      childRunCreated: true,
    },
  },
  {
    id: "delegation-target-inactive",
    category: "child_failure",
    description: "Delegating to inactive agent returns error",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Offline", canReceive: true, active: false },
      currentDepth: 0,
      maxDepth: 3,
      task: "Help me",
    },
    expected: {
      success: false,
      errorType: "target_agent_unavailable",
    },
  },
  {
    id: "delegation-target-cannot-receive",
    category: "child_failure",
    description: "Delegating to agent with canReceive=false returns error",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Solo", canReceive: false, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Help me",
    },
    expected: {
      success: false,
      errorType: "target_cannot_receive",
    },
  },

  // --- Fan-out ---
  {
    id: "async-fan-out-limit-exceeded",
    category: "fan_out",
    description: "Async delegation blocked when fan-out limit reached",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Worker", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "One more background task",
      isAsync: true,
      activeDelegations: 3,
      maxFanOut: 3,
    },
    expected: {
      success: false,
      errorType: "fan_out_limit",
    },
  },

  // --- Budget inheritance ---
  {
    id: "delegation-budget-adjusted",
    category: "budget_inheritance",
    description: "Child budget is reduced based on parent usage",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Helper", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Quick task",
      parentBudgetUsed: { tokens: 50000, invocations: 20, spendCents: 100 },
      parentBudgetMax: { tokens: 200000, invocations: 50, spendCents: 500 },
      childResult: { success: true, result: "Done", tokensUsed: 2000 },
    },
    expected: {
      success: true,
      parentBudgetReduced: true,
    },
  },

  // --- Permission narrowing ---
  {
    id: "delegation-tools-narrowed",
    category: "permission_narrowing",
    description: "Child tools narrowed to intersection of parent's available tools",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Helper", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Help me",
      parentToolKeys: ["memory_search", "web_search", "http_request"],
      childToolKeys: ["memory_search", "memory_write", "web_search", "schedule_list", "browser_navigate"],
      childResult: { success: true, result: "Done" },
    },
    expected: {
      success: true,
      // memory_search + memory_write (always pass through) + web_search (in parent set)
      // schedule_list always passes through, browser_navigate NOT in parent set
      narrowedToolCount: 4,
    },
  },
  {
    id: "delegation-core-tools-always-available",
    category: "permission_narrowing",
    description: "Memory, schedule, and config tools always pass through narrowing",
    setup: {
      parentAgent: { id: "agent-a", name: "Agent A", canDelegate: true },
      targetAgent: { id: "agent-b", name: "Agent B", role: "Helper", canReceive: true, active: true },
      currentDepth: 0,
      maxDepth: 3,
      task: "Use core tools",
      parentToolKeys: [], // parent has NO tools
      childToolKeys: ["memory_search", "memory_write", "schedule_list", "self_config_update"],
      childResult: { success: true, result: "Done" },
    },
    expected: {
      success: true,
      narrowedToolCount: 4, // all 4 are core tools, always pass through
    },
  },
];

export const DELEGATION_SCENARIO_COUNTS = {
  total: DELEGATION_EVAL_SCENARIOS.length,
  byCategory: Object.fromEntries(
    [
      "sync_happy_path",
      "async_happy_path",
      "depth_limit",
      "recursion",
      "child_failure",
      "fan_out",
      "budget_inheritance",
      "permission_narrowing",
    ].map((cat) => [
      cat,
      DELEGATION_EVAL_SCENARIOS.filter((s) => s.category === cat).length,
    ])
  ) as Record<string, number>,
};
