import type {
  CheapCheckResult,
  HeartbeatDeliveryStatus,
} from "../../types/heartbeat";

export function asPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function buildHeartbeatFreshnessMetadata(
  results: Record<string, CheapCheckResult>
): Record<string, unknown> {
  return Object.entries(results).reduce<Record<string, unknown>>((acc, [key, result]) => {
    if (result.observability && typeof result.observability === "object") {
      acc[key] = result.observability;
    }

    return acc;
  }, {});
}

export function buildHeartbeatDecisionTrace(input: {
  requestTraceId?: string;
  previewOnly: boolean;
  hadSignal: boolean;
  checksOutput: Record<string, CheapCheckResult>;
  signalFingerprints: string[];
  issuePlan: {
    activeIssues: unknown[];
    newIssues: unknown[];
    updatedIssues: unknown[];
    resolvedIssueIds: string[];
    notificationCandidates: Array<{
      issue: { signal_type: string };
      attentionType: string;
    }>;
    suppressedReasons: string[];
  };
  busyRuntimeReason: string | null;
  deliveryAttempted: boolean;
  deliveryStatus: HeartbeatDeliveryStatus;
  finalReason: string | null;
  guardrail?: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    request_trace_id: input.requestTraceId ?? null,
    preview_only: input.previewOnly,
    had_signal: input.hadSignal,
    check_results: Object.entries(input.checksOutput).map(([key, result]) => ({
      key,
      status: result.status,
    })),
    signal_types: Object.entries(input.checksOutput)
      .filter(([, result]) => result.status === "alert")
      .map(([key]) => key),
    signal_fingerprints: input.signalFingerprints,
    issue_counts: {
      active: input.issuePlan.activeIssues.length,
      new: input.issuePlan.newIssues.length,
      updated: input.issuePlan.updatedIssues.length,
      resolved: input.issuePlan.resolvedIssueIds.length,
      notification_candidates: input.issuePlan.notificationCandidates.length,
    },
    lifecycle_suppressed_reasons: input.issuePlan.suppressedReasons,
    busy_runtime_reason: input.busyRuntimeReason,
    selected_signal_types: input.issuePlan.notificationCandidates.map(
      (candidate) => candidate.issue.signal_type
    ),
    selected_attention_types: input.issuePlan.notificationCandidates.map(
      (candidate) => candidate.attentionType
    ),
    delivery_attempted: input.deliveryAttempted,
    delivery_status: input.deliveryStatus,
    final_state: input.deliveryStatus,
    final_reason: input.finalReason,
    guardrail: input.guardrail ?? null,
  };
}
