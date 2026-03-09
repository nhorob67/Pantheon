import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheapCheckResult } from "@/types/heartbeat";

export async function checkUnreviewedTickets(
  admin: SupabaseClient,
  tenantId: string,
  thresholdHours: number
): Promise<CheapCheckResult> {
  const cutoff = new Date(
    Date.now() - thresholdHours * 60 * 60 * 1000
  ).toISOString();

  const { count, error } = await admin
    .from("tenant_scale_tickets")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("reviewed_at", null)
    .lte("created_at", cutoff);

  if (error) {
    return {
      status: "error",
      summary: `Ticket check failed: ${error.message}`,
      observability: {
        threshold_hours: thresholdHours,
        cutoff_at: cutoff,
        oldest_matching_created_at: null,
      },
    };
  }

  const { data: oldestRow } = await admin
    .from("tenant_scale_tickets")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .is("reviewed_at", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const unreviewedCount = count ?? 0;
  if (unreviewedCount === 0) {
    return {
      status: "ok",
      summary: "No unreviewed tickets",
      observability: {
        threshold_hours: thresholdHours,
        cutoff_at: cutoff,
        oldest_matching_created_at: null,
        count: 0,
      },
    };
  }

  return {
    status: "alert",
    summary: `${unreviewedCount} unreviewed scale ticket(s) older than ${thresholdHours}h`,
    data: { count: unreviewedCount, threshold_hours: thresholdHours },
    observability: {
      threshold_hours: thresholdHours,
      cutoff_at: cutoff,
      oldest_matching_created_at:
        typeof oldestRow?.created_at === "string" ? oldestRow.created_at : null,
      count: unreviewedCount,
    },
  };
}
