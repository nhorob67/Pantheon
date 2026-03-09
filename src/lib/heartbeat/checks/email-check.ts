import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheapCheckResult } from "@/types/heartbeat";

export async function checkUnansweredEmails(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  agentId: string | null,
  thresholdHours: number
): Promise<CheapCheckResult> {
  const cutoff = new Date(
    Date.now() - thresholdHours * 60 * 60 * 1000
  ).toISOString();

  const countQuery = admin
    .from("email_inbound")
    .select(
      agentId ? "id, tenant_sessions!inner(agent_id)" : "id",
      { count: "exact", head: true }
    )
    .eq("customer_id", customerId)
    .is("replied_at", null)
    .lte("created_at", cutoff);

  if (agentId) {
    countQuery.eq("tenant_sessions.agent_id", agentId);
  }

  const { count, error } = await countQuery;

  if (error) {
    return {
      status: "error",
      summary: `Email check failed: ${error.message}`,
      observability: {
        scope: agentId ? "agent" : "tenant",
        agent_id: agentId,
        threshold_hours: thresholdHours,
        cutoff_at: cutoff,
        oldest_matching_created_at: null,
      },
    };
  }

  const oldestQuery = admin
    .from("email_inbound")
    .select(agentId ? "created_at, tenant_sessions!inner(agent_id)" : "created_at")
    .eq("customer_id", customerId)
    .is("replied_at", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(1);

  if (agentId) {
    oldestQuery.eq("tenant_sessions.agent_id", agentId);
  }

  const { data: oldestRow } = await oldestQuery.maybeSingle();
  const oldestCreatedAt = (() => {
    if (typeof oldestRow !== "object" || oldestRow === null) {
      return null;
    }

    const value = (oldestRow as { created_at?: unknown }).created_at;
    return typeof value === "string" ? value : null;
  })();

  const unansweredCount = count ?? 0;
  if (unansweredCount === 0) {
    return {
      status: "ok",
      summary: "No unanswered emails",
      observability: {
        scope: agentId ? "agent" : "tenant",
        agent_id: agentId,
        threshold_hours: thresholdHours,
        cutoff_at: cutoff,
        oldest_matching_created_at: null,
        count: 0,
      },
    };
  }

  return {
    status: "alert",
    summary: `${unansweredCount} unanswered email(s) older than ${thresholdHours}h`,
    data: { count: unansweredCount, threshold_hours: thresholdHours },
    observability: {
      scope: agentId ? "agent" : "tenant",
      agent_id: agentId,
      threshold_hours: thresholdHours,
      cutoff_at: cutoff,
      oldest_matching_created_at: oldestCreatedAt,
      count: unansweredCount,
    },
  };
}
