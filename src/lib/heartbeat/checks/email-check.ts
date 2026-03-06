import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheapCheckResult } from "@/types/heartbeat";

export async function checkUnansweredEmails(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  thresholdHours: number
): Promise<CheapCheckResult> {
  const cutoff = new Date(
    Date.now() - thresholdHours * 60 * 60 * 1000
  ).toISOString();

  const { count, error } = await admin
    .from("email_inbound")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .is("replied_at", null)
    .lte("created_at", cutoff);

  if (error) {
    return { status: "error", summary: `Email check failed: ${error.message}` };
  }

  const unansweredCount = count ?? 0;
  if (unansweredCount === 0) {
    return { status: "ok", summary: "No unanswered emails" };
  }

  return {
    status: "alert",
    summary: `${unansweredCount} unanswered email(s) older than ${thresholdHours}h`,
    data: { count: unansweredCount, threshold_hours: thresholdHours },
  };
}
