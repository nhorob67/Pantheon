import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import {
  getInstanceWorkflowDetail,
  normalizeWorkflowDefinitionRow,
} from "@/lib/queries/workflows";
import { WorkflowBuilderShellLazy } from "@/components/workflows/workflow-builder-shell-lazy";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

type Params = Promise<{
  workflowId: string;
}>;

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Params;
}) {
  const { workflowId } = await params;
  const { customerId } = await requireDashboardCustomer();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  const supabase = await createClient();

  const { data: workflowRow } = await supabase
    .from("workflow_definitions")
    .select("id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at")
    .eq("id", workflowId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!workflowRow) {
    notFound();
  }

  const workflow = normalizeWorkflowDefinitionRow(
    workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );
  const detail = await getInstanceWorkflowDetail(
    admin,
    workflow.instance_id,
    customerId,
    workflow.id
  );
  const initialVersions = detail?.versions || [];

  return (
    <WorkflowBuilderShellLazy
      instanceId={workflow.instance_id}
      initialWorkflow={workflow}
      initialVersions={initialVersions}
    />
  );
}
