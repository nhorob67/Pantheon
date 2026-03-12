import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeartbeatChecks, CheapCheckResult } from "@/types/heartbeat";
import { checkUnansweredEmails } from "./checks/email-check";
import { checkCustomItems } from "./checks/custom-check";
import {
  buildHeartbeatCheckExecutionPlan,
  type HeartbeatCheapCheckKey,
} from "./check-scope";

export interface CheapChecksInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId?: string | null;
  effectiveScope: "all_checks" | "tenant_scoped_only" | "agent_scoped_only";
  checks: HeartbeatChecks;
  customChecks: string[];
}

export interface CheapChecksOutput {
  results: Record<string, CheapCheckResult>;
  checkDurations: Record<string, number>;
  hadSignal: boolean;
  signalSummaries: string[];
}

function buildSkippedAgentScopedResult(
  key: Exclude<HeartbeatCheapCheckKey, "unanswered_emails">
): CheapCheckResult {
  return {
    status: "ok",
    summary: `Skipped on agent override: ${key.replaceAll("_", " ")} remains tenant-scoped`,
    observability: {
      skipped: true,
      skip_reason: "tenant_scoped_only",
      execution_scope: "agent_override",
      check_key: key,
    },
  };
}

function buildSkippedTenantScopedResult(): CheapCheckResult {
  return {
    status: "ok",
    summary: "Skipped on tenant default: unanswered email checks move to enabled agent overrides",
    observability: {
      skipped: true,
      skip_reason: "agent_scoped_only",
      execution_scope: "tenant_default",
      check_key: "unanswered_emails",
    },
  };
}

export async function runCheapChecks(input: CheapChecksInput): Promise<CheapChecksOutput> {
  const {
    admin,
    tenantId,
    customerId,
    agentId,
    effectiveScope,
    checks,
    customChecks,
  } = input;
  const results: Record<string, CheapCheckResult> = {};
  const checkDurations: Record<string, number> = {};
  const promises: Array<{ key: string; promise: Promise<CheapCheckResult> }> = [];
  const executionPlan = buildHeartbeatCheckExecutionPlan({
    checks,
    customChecks,
    scope: effectiveScope,
  });

  const withTiming = async (
    key: string,
    fn: () => Promise<CheapCheckResult>
  ): Promise<CheapCheckResult> => {
    const startedAt = Date.now();
    try {
      return await fn();
    } finally {
      checkDurations[key] = Date.now() - startedAt;
    }
  };

  if (executionPlan.find((item) => item.key === "unanswered_emails")?.willRun) {
    promises.push({
      key: "unanswered_emails",
      promise: withTiming("unanswered_emails", () =>
        checkUnansweredEmails(
          admin,
          tenantId,
          customerId,
          agentId ?? null,
          checks.unanswered_emails_threshold_hours
        )
      ),
    });
  } else if (checks.unanswered_emails && effectiveScope === "tenant_scoped_only") {
    results.unanswered_emails = buildSkippedTenantScopedResult();
    checkDurations.unanswered_emails = 0;
  }

  // Run all enabled checks in parallel
  const settled = await Promise.allSettled(promises.map((p) => p.promise));
  for (let i = 0; i < promises.length; i++) {
    const { key } = promises[i];
    const result = settled[i];
    if (result.status === "fulfilled") {
      results[key] = result.value;
    } else {
      results[key] = {
        status: "error",
        summary: `Check failed: ${result.reason instanceof Error ? result.reason.message : "unknown"}`,
      };
    }
  }

  // Custom checks always signal if non-empty
  if (executionPlan.find((item) => item.key === "custom_checks")?.willRun) {
    const startedAt = Date.now();
    results.custom_checks = checkCustomItems(customChecks);
    checkDurations.custom_checks = Date.now() - startedAt;
  } else if (customChecks.length > 0 && effectiveScope === "agent_scoped_only") {
    results.custom_checks = buildSkippedAgentScopedResult("custom_checks");
    checkDurations.custom_checks = 0;
  }

  const signalSummaries: string[] = [];
  let hadSignal = false;
  for (const [, result] of Object.entries(results)) {
    if (result.status === "alert") {
      hadSignal = true;
      if (result.summary) signalSummaries.push(result.summary);
    }
  }

  return { results, checkDurations, hadSignal, signalSummaries };
}
