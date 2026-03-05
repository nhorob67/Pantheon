import type { SupabaseClient } from "@supabase/supabase-js";
import { isFeatureFlagEnabledOrDefaultTrue } from "@/lib/queries/extensibility";
import { isWorkflowBuilderRolledOutToCustomer } from "@/lib/workflows/launch-readiness";

export const WORKFLOW_BUILDER_FEATURE_FLAG_KEY = "workflow.builder";
export const WORKFLOW_BUILDER_DISABLED_MESSAGE =
  "Workflow builder is disabled for this customer.";

export async function isWorkflowBuilderEnabledForCustomer(
  admin: SupabaseClient,
  customerId: string | null | undefined
): Promise<boolean> {
  if (!customerId) {
    return false;
  }

  try {
    const baseFlagEnabled = await isFeatureFlagEnabledOrDefaultTrue(
      admin,
      customerId,
      WORKFLOW_BUILDER_FEATURE_FLAG_KEY
    );

    if (!baseFlagEnabled) {
      return false;
    }

    return isWorkflowBuilderRolledOutToCustomer(customerId);
  } catch {
    // Feature flag check should never crash the page — fail open to default (true)
    return true;
  }
}
