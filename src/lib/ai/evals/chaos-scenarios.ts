// ---------------------------------------------------------------------------
// Phase 7.1.6: Chaos / Failure Test Scenarios
// Verifies graceful degradation when external dependencies fail.
// ---------------------------------------------------------------------------

export interface ChaosEvalScenario {
  id: string;
  category:
    | "mcp_failure"
    | "browser_failure"
    | "delegation_failure"
    | "database_failure"
    | "trigger_failure";
  description: string;
  /** What failure to inject */
  failureInjection: FailureInjection;
  /** Expected system behavior under failure */
  expected: ChaosExpectedOutcome;
}

export interface FailureInjection {
  type:
    | "connection_timeout"
    | "connection_refused"
    | "response_timeout"
    | "http_503"
    | "crash_mid_execution"
    | "disconnect"
    | "retry_exhaustion"
    | "invalid_response";
  target: string;
  /** Duration of failure in ms (for transient failures) */
  durationMs?: number;
}

export interface ChaosExpectedOutcome {
  /** Run should still complete (possibly with error) — no crashes */
  runCompletes: boolean;
  /** Expected final run status */
  runStatus: "completed" | "failed";
  /** Error is reported to the model/user, not swallowed */
  errorReported: boolean;
  /** Trace is still written despite the failure */
  traceWritten: boolean;
  /** Guardrail events are still flushed despite the failure */
  guardrailsFlushed: boolean;
  /** Description of expected behavior */
  expectedBehavior: string;
}

export const CHAOS_EVAL_SCENARIOS: ChaosEvalScenario[] = [
  // --- MCP failures ---
  {
    id: "chaos-mcp-connection-timeout",
    category: "mcp_failure",
    description: "MCP server connection times out during tool discovery",
    failureInjection: {
      type: "connection_timeout",
      target: "mcp_server",
      durationMs: 20000,
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "MCP tools excluded from available set; agent continues with native tools",
    },
  },
  {
    id: "chaos-mcp-crash-mid-tool",
    category: "mcp_failure",
    description: "MCP server crashes while executing a tool",
    failureInjection: {
      type: "crash_mid_execution",
      target: "mcp_tool_execution",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Tool returns error result to model; agent can retry or use alternative",
    },
  },
  {
    id: "chaos-mcp-invalid-response",
    category: "mcp_failure",
    description: "MCP tool returns unparseable response",
    failureInjection: {
      type: "invalid_response",
      target: "mcp_tool_execution",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Raw text fallback returned to model; no crash",
    },
  },

  // --- Browser failures ---
  {
    id: "chaos-browser-session-disconnect",
    category: "browser_failure",
    description: "Browser session disconnects mid-action",
    failureInjection: {
      type: "disconnect",
      target: "browser_session",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Session error returned to model; agent can describe the issue to user",
    },
  },
  {
    id: "chaos-browser-action-timeout",
    category: "browser_failure",
    description: "Browser action (click/fill) times out waiting for page response",
    failureInjection: {
      type: "response_timeout",
      target: "browser_action",
      durationMs: 30000,
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Timeout error returned with retryable=true; agent can retry or inform user",
    },
  },

  // --- Delegation failures ---
  {
    id: "chaos-child-run-timeout",
    category: "delegation_failure",
    description: "Child run times out during sync delegation",
    failureInjection: {
      type: "response_timeout",
      target: "child_run_execution",
      durationMs: 300000,
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Delegation returns timeout error to parent; child run marked failed",
    },
  },
  {
    id: "chaos-child-run-crash",
    category: "delegation_failure",
    description: "Child worker crashes during delegation",
    failureInjection: {
      type: "crash_mid_execution",
      target: "child_run_execution",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: true,
      traceWritten: true,
      guardrailsFlushed: true,
      expectedBehavior: "Error propagated to parent; child run marked failed; parent continues",
    },
  },

  // --- Database failures ---
  {
    id: "chaos-supabase-503-on-trace-write",
    category: "database_failure",
    description: "Supabase returns 503 when writing conversation trace",
    failureInjection: {
      type: "http_503",
      target: "tenant_conversation_traces",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: false, // trace write is best-effort
      traceWritten: false,
      guardrailsFlushed: true,
      expectedBehavior: "Trace write fails silently; run result still returned to user; warning logged",
    },
  },
  {
    id: "chaos-supabase-503-on-guardrail-flush",
    category: "database_failure",
    description: "Supabase returns 503 when flushing guardrail events",
    failureInjection: {
      type: "http_503",
      target: "tenant_guardrail_events",
    },
    expected: {
      runCompletes: true,
      runStatus: "completed",
      errorReported: false, // guardrail flush is best-effort
      traceWritten: true,
      guardrailsFlushed: false,
      expectedBehavior: "Guardrail flush fails silently; run result still returned; warning logged",
    },
  },

  // --- Trigger.dev failures ---
  {
    id: "chaos-trigger-retry-exhaustion",
    category: "trigger_failure",
    description: "Trigger.dev retries exhausted after 3 attempts",
    failureInjection: {
      type: "retry_exhaustion",
      target: "process_runtime_run",
    },
    expected: {
      runCompletes: true,
      runStatus: "failed",
      errorReported: true,
      traceWritten: false,
      guardrailsFlushed: false,
      expectedBehavior: "Run marked as failed after max retries; error_message set; notification sent",
    },
  },
  {
    id: "chaos-trigger-run-claim-lost",
    category: "trigger_failure",
    description: "Run claim expires before execution completes",
    failureInjection: {
      type: "response_timeout",
      target: "run_claim",
      durationMs: 120000,
    },
    expected: {
      runCompletes: true,
      runStatus: "failed",
      errorReported: true,
      traceWritten: false,
      guardrailsFlushed: false,
      expectedBehavior: "Run returns to queued state; next attempt picks it up; max_attempts enforced",
    },
  },
];

export const CHAOS_SCENARIO_COUNTS = {
  total: CHAOS_EVAL_SCENARIOS.length,
  byCategory: Object.fromEntries(
    ["mcp_failure", "browser_failure", "delegation_failure", "database_failure", "trigger_failure"].map(
      (cat) => [cat, CHAOS_EVAL_SCENARIOS.filter((s) => s.category === cat).length]
    )
  ) as Record<string, number>,
};
