import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import {
  getInstanceWorkflowDetail,
  normalizeWorkflowDefinitionRow,
} from "@/lib/queries/workflows";
import { WorkflowBuilderShellLazy } from "@/components/workflows/workflow-builder-shell-lazy";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{
  workflowId: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { workflowId } = await params;
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();
  const { data: workflow } = await supabase
    .from("workflow_definitions")
    .select("name")
    .eq("id", workflowId)
    .eq("customer_id", customerId)
    .maybeSingle();

  return {
    title: workflow?.name ?? "Workflow",
  };
}

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Params;
}) {
  const [{ workflowId }, { customerId }] = await Promise.all([
    params,
    requireDashboardCustomer(),
  ]);

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  return (
    <Suspense fallback={<WorkflowBuilderSkeleton />}>
      <WorkflowBuilderContent
        workflowId={workflowId}
        customerId={customerId}
        admin={admin}
      />
    </Suspense>
  );
}

async function WorkflowBuilderContent({
  workflowId,
  customerId,
  admin,
}: {
  workflowId: string;
  customerId: string;
  admin: ReturnType<typeof createAdminClient>;
}) {
  const [supabase, tenant] = await Promise.all([
    createClient(),
    getCustomerTenant(customerId),
  ]);

  const { data: workflowRow } = await supabase
    .from("workflow_definitions")
    .select("id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at")
    .eq("id", workflowId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!workflowRow) {
    notFound();
  }

  if (!tenant) {
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
      tenantId={tenant.id}
      initialWorkflow={workflow}
      initialVersions={initialVersions}
    />
  );
}

function WorkflowBuilderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-[500px] rounded-xl" />
    </div>
  );
}
