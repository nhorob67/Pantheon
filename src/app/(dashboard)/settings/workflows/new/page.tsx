import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { requireDashboardCustomer, getCustomerInstance, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { WorkflowCreateFormLazy } from "@/components/workflows/workflow-create-form-lazy";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";
import {
  listStarterWorkflowTemplates,
  listWorkflowTemplateLibrary,
} from "@/lib/workflows/templates";
import { listWorkflowPlaybookCatalog } from "@/lib/workflows/playbooks";
import type { WorkflowPlaybook } from "@/types/workflow";

type SearchParams = Promise<{
  source?: string;
  playbook_id?: string;
}>;

export default async function WorkflowCreatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { source, playbook_id: playbookId } = await searchParams;
  const { customerId } = await requireDashboardCustomer();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  const [instance, tenant] = await Promise.all([
    getCustomerInstance(customerId),
    getCustomerTenant(customerId),
  ]);

  if (!instance || !tenant) {
    return (
      <div className="space-y-2">
        <h3 className="font-headline text-lg font-semibold text-text-primary">
          Create Workflow
        </h3>
        <p className="text-sm text-text-dim">
          Provision your instance first before creating workflows.
        </p>
      </div>
    );
  }

  let templates = listStarterWorkflowTemplates();
  let playbooks: WorkflowPlaybook[] = [];
  try {
    const [templateLibrary, playbookCatalog] = await Promise.all([
      listWorkflowTemplateLibrary(admin, instance.id, customerId),
      listWorkflowPlaybookCatalog(admin, {
        customerId,
        includeOwned: true,
      }),
    ]);
    templates = templateLibrary;
    playbooks = playbookCatalog;
  } catch {
    templates = listStarterWorkflowTemplates();
    playbooks = [];
  }

  return (
    <WorkflowCreateFormLazy
      tenantId={tenant.id}
      templates={templates}
      playbooks={playbooks}
      initialSourceType={source === "playbook" ? "playbook" : "template"}
      initialPlaybookId={playbookId}
    />
  );
}
