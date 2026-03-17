// ---------------------------------------------------------------------------
// Phase 7.1.5: Regression Eval Scenarios
// Cross-cutting scenarios for approval flow, audit logging, and trace
// completeness. These verify system-level behaviors, not individual tools.
// ---------------------------------------------------------------------------

export interface RegressionEvalScenario {
  id: string;
  category: "approval_flow" | "audit_logging" | "trace_completeness";
  description: string;
  /** What to check — declarative specification, not executable */
  check: RegressionCheck;
}

export interface RegressionCheck {
  /** Table or system to verify */
  target: string;
  /** Field or property to check */
  field: string;
  /** Expected condition */
  condition: "present" | "not_empty" | "matches_pattern" | "count_gte";
  /** Pattern or count threshold */
  value?: string | number;
}

export const REGRESSION_EVAL_SCENARIOS: RegressionEvalScenario[] = [
  // --- Approval flow ---
  {
    id: "approval-denied-tool-returns-error",
    category: "approval_flow",
    description: "Denied tool invocations return policy_denied error to model",
    check: {
      target: "unified_executor_result",
      field: "error",
      condition: "matches_pattern",
      value: "policy_denied",
    },
  },
  {
    id: "approval-required-tool-returns-message",
    category: "approval_flow",
    description: "Approval-required invocations return approval_required with role info",
    check: {
      target: "unified_executor_result",
      field: "error",
      condition: "matches_pattern",
      value: "approval_required",
    },
  },
  {
    id: "approval-autonomy-gating-fires",
    category: "approval_flow",
    description: "L1/L2 agents get approval_required for high-impact tools",
    check: {
      target: "invocation_record",
      field: "policyReason",
      condition: "matches_pattern",
      value: "autonomy_gate",
    },
  },
  {
    id: "approval-guardrail-escalation",
    category: "approval_flow",
    description: "Middleware escalate_approval verdict returns approval_required to model",
    check: {
      target: "unified_executor_result",
      field: "error",
      condition: "matches_pattern",
      value: "approval_required",
    },
  },

  // --- Audit logging ---
  {
    id: "audit-tool-invocation-recorded",
    category: "audit_logging",
    description: "Every tool invocation is recorded in tenant_tool_invocations",
    check: {
      target: "tenant_tool_invocations",
      field: "tool_key",
      condition: "not_empty",
    },
  },
  {
    id: "audit-invocation-has-policy-decision",
    category: "audit_logging",
    description: "Invocation records include policy decision and reason",
    check: {
      target: "tenant_tool_invocations",
      field: "policy_decision",
      condition: "present",
    },
  },
  {
    id: "audit-guardrail-events-persisted",
    category: "audit_logging",
    description: "Guardrail events are persisted to tenant_guardrail_events",
    check: {
      target: "tenant_guardrail_events",
      field: "event_kind",
      condition: "not_empty",
    },
  },
  {
    id: "audit-telemetry-events-written",
    category: "audit_logging",
    description: "Telemetry events are flushed on run completion",
    check: {
      target: "telemetry_events",
      field: "id",
      condition: "present",
    },
  },

  // --- Trace completeness ---
  {
    id: "trace-tools-available-populated",
    category: "trace_completeness",
    description: "Conversation trace includes tools_available array",
    check: {
      target: "tenant_conversation_traces",
      field: "tools_available",
      condition: "not_empty",
    },
  },
  {
    id: "trace-tools-invoked-populated",
    category: "trace_completeness",
    description: "Conversation trace includes tools_invoked with summaries",
    check: {
      target: "tenant_conversation_traces",
      field: "tools_invoked",
      condition: "not_empty",
    },
  },
  {
    id: "trace-web-citations-present",
    category: "trace_completeness",
    description: "Web research runs include web_citations in trace",
    check: {
      target: "tenant_conversation_traces",
      field: "web_citations",
      condition: "not_empty",
    },
  },
  {
    id: "trace-delegation-events-present",
    category: "trace_completeness",
    description: "Delegation runs include delegation_events in trace",
    check: {
      target: "tenant_conversation_traces",
      field: "delegation_events",
      condition: "not_empty",
    },
  },
  {
    id: "trace-browser-sessions-present",
    category: "trace_completeness",
    description: "Browser runs include browser_sessions in trace",
    check: {
      target: "tenant_conversation_traces",
      field: "browser_sessions",
      condition: "not_empty",
    },
  },
  {
    id: "trace-guardrail-summary-present",
    category: "trace_completeness",
    description: "All runs include guardrail_summary in trace with event details",
    check: {
      target: "tenant_conversation_traces",
      field: "guardrail_summary",
      condition: "present",
    },
  },
  {
    id: "trace-guardrail-events-array-present",
    category: "trace_completeness",
    description: "Guardrail summary includes per-event detail array",
    check: {
      target: "tenant_conversation_traces",
      field: "guardrail_summary.events",
      condition: "present",
    },
  },
  {
    id: "trace-model-metrics-present",
    category: "trace_completeness",
    description: "Traces include model_id, input_tokens, output_tokens, latency",
    check: {
      target: "tenant_conversation_traces",
      field: "model_id",
      condition: "not_empty",
    },
  },
];

export const REGRESSION_SCENARIO_COUNTS = {
  total: REGRESSION_EVAL_SCENARIOS.length,
  byCategory: Object.fromEntries(
    ["approval_flow", "audit_logging", "trace_completeness"].map((cat) => [
      cat,
      REGRESSION_EVAL_SCENARIOS.filter((s) => s.category === cat).length,
    ])
  ) as Record<string, number>,
};
