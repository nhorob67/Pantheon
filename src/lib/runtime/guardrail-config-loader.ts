import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_GUARDRAIL_CONFIG,
  type GuardrailConfig,
} from "./guardrails";
import type { RateLimitConfig } from "./guardrail-middleware";

interface RunBudgetRow {
  loop_warning_threshold: number;
  loop_hard_stop_threshold: number;
  max_tool_invocations: number;
  max_elapsed_ms: number;
  max_tokens: number;
  max_spend_cents: number;
  max_concurrent_delegations?: number;
  max_delegation_spend_cents?: number;
  max_browser_actions?: number;
  max_browser_session_ms?: number;
  // Phase 6: Advanced detection config
  ping_pong_threshold?: number;
  browser_no_progress_threshold?: number;
  max_delegation_depth?: number;
  retry_allowed_tools?: string[];
  // Phase 6.2.4: Per-capability middleware rate limits
  max_web_fetch_per_run?: number;
  max_delegation_fan_out?: number;
  max_browser_actions_per_minute?: number;
}

export interface DelegationBudgetConfig {
  maxConcurrentDelegations: number;
  maxDelegationSpendCents: number;
}

/**
 * Load guardrail config for a run. Checks for agent-specific overrides first,
 * then tenant-wide defaults, then falls back to system defaults.
 */
export async function loadGuardrailConfig(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null
): Promise<GuardrailConfig> {
  // Try agent-specific config first
  if (agentId) {
    const { data: agentConfig } = await admin
      .from("tenant_run_budget_configs")
      .select(
        "loop_warning_threshold, loop_hard_stop_threshold, max_tool_invocations, max_elapsed_ms, max_tokens, max_spend_cents, max_concurrent_delegations, max_delegation_spend_cents, max_browser_actions, max_browser_session_ms, ping_pong_threshold, browser_no_progress_threshold, max_delegation_depth, retry_allowed_tools, max_web_fetch_per_run, max_delegation_fan_out, max_browser_actions_per_minute"
      )
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (agentConfig) {
      return rowToConfig(agentConfig as RunBudgetRow);
    }
  }

  // Try tenant-wide default (agent_id IS NULL)
  const { data: tenantConfig } = await admin
    .from("tenant_run_budget_configs")
    .select(
      "loop_warning_threshold, loop_hard_stop_threshold, max_tool_invocations, max_elapsed_ms, max_tokens, max_spend_cents, max_concurrent_delegations, max_delegation_spend_cents, max_browser_actions, max_browser_session_ms, ping_pong_threshold, browser_no_progress_threshold, max_delegation_depth, retry_allowed_tools, max_web_fetch_per_run, max_delegation_fan_out, max_browser_actions_per_minute"
    )
    .eq("tenant_id", tenantId)
    .is("agent_id", null)
    .maybeSingle();

  if (tenantConfig) {
    return rowToConfig(tenantConfig as RunBudgetRow);
  }

  return { ...DEFAULT_GUARDRAIL_CONFIG };
}

export { type GuardrailConfig } from "./guardrails";

const DEFAULT_DELEGATION_BUDGET: DelegationBudgetConfig = {
  maxConcurrentDelegations: 5,
  maxDelegationSpendCents: 1000,
};

export async function loadDelegationBudgetConfig(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null
): Promise<DelegationBudgetConfig> {
  const selectCols =
    "max_concurrent_delegations, max_delegation_spend_cents";

  if (agentId) {
    const { data } = await admin
      .from("tenant_run_budget_configs")
      .select(selectCols)
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (data) {
      return rowToDelegationBudget(data as Pick<RunBudgetRow, "max_concurrent_delegations" | "max_delegation_spend_cents">);
    }
  }

  const { data } = await admin
    .from("tenant_run_budget_configs")
    .select(selectCols)
    .eq("tenant_id", tenantId)
    .is("agent_id", null)
    .maybeSingle();

  if (data) {
    return rowToDelegationBudget(data as Pick<RunBudgetRow, "max_concurrent_delegations" | "max_delegation_spend_cents">);
  }

  return { ...DEFAULT_DELEGATION_BUDGET };
}

function rowToConfig(row: RunBudgetRow): GuardrailConfig {
  return {
    loopWarningThreshold: row.loop_warning_threshold,
    loopHardStopThreshold: row.loop_hard_stop_threshold,
    maxToolInvocations: row.max_tool_invocations,
    maxElapsedMs: row.max_elapsed_ms,
    maxTokens: row.max_tokens,
    maxSpendCents: row.max_spend_cents,
    maxBrowserActions: row.max_browser_actions ?? DEFAULT_GUARDRAIL_CONFIG.maxBrowserActions,
    maxBrowserSessionMs: row.max_browser_session_ms ?? DEFAULT_GUARDRAIL_CONFIG.maxBrowserSessionMs,
    pingPongThreshold: row.ping_pong_threshold ?? DEFAULT_GUARDRAIL_CONFIG.pingPongThreshold,
    browserNoProgressThreshold: row.browser_no_progress_threshold ?? DEFAULT_GUARDRAIL_CONFIG.browserNoProgressThreshold,
    maxDelegationDepth: row.max_delegation_depth ?? DEFAULT_GUARDRAIL_CONFIG.maxDelegationDepth,
    retryAllowedTools: row.retry_allowed_tools ?? DEFAULT_GUARDRAIL_CONFIG.retryAllowedTools,
  };
}

function rowToDelegationBudget(
  row: Pick<RunBudgetRow, "max_concurrent_delegations" | "max_delegation_spend_cents">
): DelegationBudgetConfig {
  return {
    maxConcurrentDelegations: row.max_concurrent_delegations ?? DEFAULT_DELEGATION_BUDGET.maxConcurrentDelegations,
    maxDelegationSpendCents: row.max_delegation_spend_cents ?? DEFAULT_DELEGATION_BUDGET.maxDelegationSpendCents,
  };
}

/**
 * Load per-capability rate limit overrides from the DB.
 * Returns only the fields that are explicitly set — callers should spread
 * over DEFAULT_RATE_LIMIT_CONFIG to fill gaps.
 */
export async function loadMiddlewareRateLimits(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null
): Promise<Partial<RateLimitConfig>> {
  const selectCols =
    "max_web_fetch_per_run, max_delegation_fan_out, max_browser_actions_per_minute";

  if (agentId) {
    const { data } = await admin
      .from("tenant_run_budget_configs")
      .select(selectCols)
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (data) {
      return rowToRateLimits(data as Pick<RunBudgetRow, "max_web_fetch_per_run" | "max_delegation_fan_out" | "max_browser_actions_per_minute">);
    }
  }

  const { data } = await admin
    .from("tenant_run_budget_configs")
    .select(selectCols)
    .eq("tenant_id", tenantId)
    .is("agent_id", null)
    .maybeSingle();

  if (data) {
    return rowToRateLimits(data as Pick<RunBudgetRow, "max_web_fetch_per_run" | "max_delegation_fan_out" | "max_browser_actions_per_minute">);
  }

  return {};
}

function rowToRateLimits(
  row: Pick<RunBudgetRow, "max_web_fetch_per_run" | "max_delegation_fan_out" | "max_browser_actions_per_minute">
): Partial<RateLimitConfig> {
  const result: Partial<RateLimitConfig> = {};
  if (row.max_web_fetch_per_run != null) result.maxWebFetchPerRun = row.max_web_fetch_per_run;
  if (row.max_delegation_fan_out != null) result.maxDelegationFanOut = row.max_delegation_fan_out;
  if (row.max_browser_actions_per_minute != null) result.maxBrowserActionsPerMinute = row.max_browser_actions_per_minute;
  return result;
}
