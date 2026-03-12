import type { HeartbeatChecks } from "@/types/heartbeat";

export type HeartbeatCheapCheckKey =
  | "unanswered_emails"
  | "custom_checks";

export interface HeartbeatCheckExecutionPlanItem {
  key: HeartbeatCheapCheckKey;
  willRun: boolean;
  reason:
    | "enabled"
    | "disabled"
    | "tenant_scoped_only"
    | "agent_scoped_only";
}

function buildPlanItem(
  key: HeartbeatCheapCheckKey,
  enabled: boolean,
  scope: "all_checks" | "tenant_scoped_only" | "agent_scoped_only"
): HeartbeatCheckExecutionPlanItem {
  if (!enabled) {
    return {
      key,
      willRun: false,
      reason: "disabled",
    };
  }

  if (scope === "tenant_scoped_only" && key === "unanswered_emails") {
    return {
      key,
      willRun: false,
      reason: "agent_scoped_only",
    };
  }

  if (scope === "agent_scoped_only" && key !== "unanswered_emails") {
    return {
      key,
      willRun: false,
      reason: "tenant_scoped_only",
    };
  }

  return {
    key,
    willRun: true,
    reason: "enabled",
  };
}

export function buildHeartbeatCheckExecutionPlan(input: {
  checks: HeartbeatChecks;
  customChecks: string[];
  scope: "all_checks" | "tenant_scoped_only" | "agent_scoped_only";
}): HeartbeatCheckExecutionPlanItem[] {
  return [
    buildPlanItem("unanswered_emails", input.checks.unanswered_emails, input.scope),
    buildPlanItem("custom_checks", input.customChecks.length > 0, input.scope),
  ];
}
