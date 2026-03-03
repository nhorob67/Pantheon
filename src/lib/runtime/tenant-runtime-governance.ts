import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { TenantRuntimeRunKind } from "@/types/tenant-runtime";

const DEFAULT_POLICY = {
  max_requests_per_minute: 120,
  max_estimated_tokens_per_minute: 12000,
  max_tool_calls_per_minute: 300,
  max_concurrent_runs: 20,
  dispatch_timeout_ms: 10000,
  spam_duplicate_window_seconds: 20,
  spam_duplicate_threshold: 3,
} as const;

const ABUSE_PATTERNS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /\bjailbreak\b/i,
  /\bDAN\b/i,
  /system\s+prompt/i,
];

export interface TenantRuntimeGovernancePolicy {
  max_requests_per_minute: number;
  max_estimated_tokens_per_minute: number;
  max_tool_calls_per_minute: number;
  max_concurrent_runs: number;
  dispatch_timeout_ms: number;
  spam_duplicate_window_seconds: number;
  spam_duplicate_threshold: number;
}

export interface GovernanceCheckInput {
  tenantId: string;
  content: string;
  channelId: string;
  userId: string;
  runKind: TenantRuntimeRunKind;
  requestedToolCalls?: number;
}

export interface GovernanceCheckResult {
  allowed: boolean;
  status: number;
  code: string;
  message?: string;
  policy: TenantRuntimeGovernancePolicy;
  estimatedTokens: number;
  contentHash: string;
  details?: Record<string, unknown>;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function estimateTokensFromContent(content: string): number {
  const chars = content.trim().length;
  if (chars <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(chars / 4));
}

export function hashIngressContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function hasPromptAbuseSignals(content: string): boolean {
  return ABUSE_PATTERNS.some((pattern) => pattern.test(content));
}

export async function resolveTenantRuntimeGovernancePolicy(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantRuntimeGovernancePolicy> {
  const { data, error } = await admin
    .from("tenants")
    .select("metadata")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve tenant governance policy"));
  }

  const metadata =
    data && typeof data.metadata === "object" && data.metadata !== null
      ? (data.metadata as Record<string, unknown>)
      : {};
  const runtimeGovernance =
    typeof metadata.runtime_governance === "object" &&
      metadata.runtime_governance !== null &&
      !Array.isArray(metadata.runtime_governance)
      ? (metadata.runtime_governance as Record<string, unknown>)
      : {};

  return {
    max_requests_per_minute: clampNumber(
      runtimeGovernance.max_requests_per_minute,
      DEFAULT_POLICY.max_requests_per_minute,
      10,
      10000
    ),
    max_estimated_tokens_per_minute: clampNumber(
      runtimeGovernance.max_estimated_tokens_per_minute,
      DEFAULT_POLICY.max_estimated_tokens_per_minute,
      100,
      2000000
    ),
    max_tool_calls_per_minute: clampNumber(
      runtimeGovernance.max_tool_calls_per_minute,
      DEFAULT_POLICY.max_tool_calls_per_minute,
      1,
      100000
    ),
    max_concurrent_runs: clampNumber(
      runtimeGovernance.max_concurrent_runs,
      DEFAULT_POLICY.max_concurrent_runs,
      1,
      500
    ),
    dispatch_timeout_ms: clampNumber(
      runtimeGovernance.dispatch_timeout_ms,
      DEFAULT_POLICY.dispatch_timeout_ms,
      500,
      60000
    ),
    spam_duplicate_window_seconds: clampNumber(
      runtimeGovernance.spam_duplicate_window_seconds,
      DEFAULT_POLICY.spam_duplicate_window_seconds,
      5,
      300
    ),
    spam_duplicate_threshold: clampNumber(
      runtimeGovernance.spam_duplicate_threshold,
      DEFAULT_POLICY.spam_duplicate_threshold,
      2,
      20
    ),
  };
}

export async function evaluateTenantRuntimeIngressGovernance(
  admin: SupabaseClient,
  input: GovernanceCheckInput
): Promise<GovernanceCheckResult> {
  const policy = await resolveTenantRuntimeGovernancePolicy(admin, input.tenantId);
  const estimatedTokens = estimateTokensFromContent(input.content);
  const contentHash = hashIngressContent(input.content);
  const requestedToolCalls = Math.max(0, input.requestedToolCalls || 0);

  if (hasPromptAbuseSignals(input.content)) {
    return {
      allowed: false,
      status: 422,
      code: "prompt_abuse_detected",
      message: "Ingress content matched prompt abuse controls",
      policy,
      estimatedTokens,
      contentHash,
    };
  }

  const { count: concurrentCount, error: concurrentError } = await admin
    .from("tenant_runtime_runs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", input.tenantId)
    .in("status", ["queued", "running", "awaiting_approval"]);
  if (concurrentError) {
    throw new Error(
      safeErrorMessage(concurrentError, "Failed to evaluate runtime concurrency quota")
    );
  }
  if ((concurrentCount || 0) >= policy.max_concurrent_runs) {
    return {
      allowed: false,
      status: 429,
      code: "concurrency_limit_exceeded",
      message: "Tenant runtime concurrency limit exceeded",
      policy,
      estimatedTokens,
      contentHash,
      details: {
        concurrent_runs: concurrentCount || 0,
      },
    };
  }

  const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recentRuns, error: recentRunsError } = await admin
    .from("tenant_runtime_runs")
    .select("metadata")
    .eq("tenant_id", input.tenantId)
    .eq("run_kind", input.runKind)
    .gte("created_at", minuteAgo)
    .limit(2000);
  if (recentRunsError) {
    throw new Error(
      safeErrorMessage(recentRunsError, "Failed to evaluate runtime minute quotas")
    );
  }
  const runs = (recentRuns || []) as Array<{ metadata: unknown }>;
  const requestCount = runs.length;
  if (requestCount >= policy.max_requests_per_minute) {
    return {
      allowed: false,
      status: 429,
      code: "request_quota_exceeded",
      message: "Tenant request quota exceeded for the current minute",
      policy,
      estimatedTokens,
      contentHash,
      details: {
        requests_last_minute: requestCount,
      },
    };
  }

  let tokenCount = estimatedTokens;
  let toolCount = requestedToolCalls;
  for (const row of runs) {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const rowTokens = metadata.estimated_input_tokens;
    if (typeof rowTokens === "number" && Number.isFinite(rowTokens) && rowTokens > 0) {
      tokenCount += Math.floor(rowTokens);
    }
    const rowToolCalls = metadata.requested_tool_calls;
    if (
      typeof rowToolCalls === "number" &&
      Number.isFinite(rowToolCalls) &&
      rowToolCalls > 0
    ) {
      toolCount += Math.floor(rowToolCalls);
    }
  }

  if (tokenCount > policy.max_estimated_tokens_per_minute) {
    return {
      allowed: false,
      status: 429,
      code: "token_quota_exceeded",
      message: "Tenant token quota exceeded for the current minute",
      policy,
      estimatedTokens,
      contentHash,
      details: {
        estimated_tokens_last_minute: tokenCount,
      },
    };
  }

  if (toolCount > policy.max_tool_calls_per_minute) {
    return {
      allowed: false,
      status: 429,
      code: "tool_call_quota_exceeded",
      message: "Tenant tool-call quota exceeded for the current minute",
      policy,
      estimatedTokens,
      contentHash,
      details: {
        tool_calls_last_minute: toolCount,
      },
    };
  }

  const duplicateWindowIso = new Date(
    Date.now() - policy.spam_duplicate_window_seconds * 1000
  ).toISOString();
  const { data: duplicates, error: duplicateError } = await admin
    .from("tenant_runtime_runs")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("run_kind", input.runKind)
    .eq("metadata->>ingress_channel_id", input.channelId)
    .eq("metadata->>ingress_user_id", input.userId)
    .eq("metadata->>ingress_content_hash", contentHash)
    .gte("created_at", duplicateWindowIso)
    .limit(100);

  if (duplicateError) {
    throw new Error(
      safeErrorMessage(duplicateError, "Failed to evaluate runtime spam duplicate controls")
    );
  }

  const duplicateCount = Array.isArray(duplicates) ? duplicates.length : 0;
  if (duplicateCount >= policy.spam_duplicate_threshold) {
    return {
      allowed: false,
      status: 429,
      code: "spam_duplicate_blocked",
      message: "Duplicate ingress spam threshold exceeded",
      policy,
      estimatedTokens,
      contentHash,
      details: {
        duplicate_count: duplicateCount,
        duplicate_window_seconds: policy.spam_duplicate_window_seconds,
      },
    };
  }

  return {
    allowed: true,
    status: 200,
    code: "allowed",
    policy,
    estimatedTokens,
    contentHash,
    details: {
      requests_last_minute: requestCount,
      estimated_tokens_last_minute: tokenCount,
      tool_calls_last_minute: toolCount,
      concurrent_runs: concurrentCount || 0,
    },
  };
}
