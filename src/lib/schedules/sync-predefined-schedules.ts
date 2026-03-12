import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * @deprecated Predefined schedules have been removed.
 * All schedules are now custom (user-defined).
 * This function is kept as a no-op for backward compatibility.
 */
export async function syncPredefinedSchedulesToTable(
  _admin: SupabaseClient,
  _tenantId: string,
  _customerId: string,
  _agentId: string,
  _agentChannelId: string | null,
  _cronJobs: Record<string, boolean>
): Promise<void> {
  // No-op: predefined schedules removed in industry-agnostic refactor.
  // Custom schedules are managed directly via the schedule_create/delete tools.
}
