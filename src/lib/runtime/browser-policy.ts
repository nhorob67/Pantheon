import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_BROWSER_POLICY, type BrowserPolicy } from "@/types/browser";

/**
 * Load browser policy for a tenant. Falls back to system defaults.
 */
export async function loadBrowserPolicy(
  admin: SupabaseClient,
  tenantId: string
): Promise<BrowserPolicy> {
  const { data } = await admin
    .from("tenant_browser_policies")
    .select(
      "domain_allowlist, domain_blocklist, require_approval_actions, max_sessions_per_day, max_actions_per_session, max_session_duration_ms, base_cost_cents, per_action_cost_cents"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_BROWSER_POLICY };

  return {
    domainAllowlist: data.domain_allowlist ?? [],
    domainBlocklist: data.domain_blocklist ?? [],
    requireApprovalActions: data.require_approval_actions ?? [],
    maxSessionsPerDay: data.max_sessions_per_day ?? DEFAULT_BROWSER_POLICY.maxSessionsPerDay,
    maxActionsPerSession: data.max_actions_per_session ?? DEFAULT_BROWSER_POLICY.maxActionsPerSession,
    maxSessionDurationMs: data.max_session_duration_ms ?? DEFAULT_BROWSER_POLICY.maxSessionDurationMs,
    baseCostCents: data.base_cost_cents ?? DEFAULT_BROWSER_POLICY.baseCostCents,
    perActionCostCents: data.per_action_cost_cents ?? DEFAULT_BROWSER_POLICY.perActionCostCents,
  };
}

/**
 * Check if the tenant has remaining browser session quota for today.
 */
export async function checkBrowserSessionQuota(
  admin: SupabaseClient,
  tenantId: string,
  maxSessionsPerDay: number
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await admin
    .from("tenant_browser_sessions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", todayStart.toISOString());

  const used = count ?? 0;
  return {
    allowed: used < maxSessionsPerDay,
    used,
    limit: maxSessionsPerDay,
  };
}
