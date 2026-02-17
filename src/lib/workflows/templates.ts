import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getInstanceWorkflowTemplate,
  listInstanceWorkflowTemplates,
} from "@/lib/queries/workflow-templates";
import type { WorkflowTemplate } from "@/types/workflow";
import {
  buildWorkflowDraftFromTemplate,
  cloneWorkflowGraph,
  getStarterWorkflowTemplateById,
  isWorkflowTemplateVisibleToTenant,
  listStarterWorkflowTemplates,
} from "./templates-core";

export {
  buildWorkflowDraftFromTemplate,
  cloneWorkflowGraph,
  getStarterWorkflowTemplateById,
  isWorkflowTemplateVisibleToTenant,
  listStarterWorkflowTemplates,
};

export async function listWorkflowTemplateLibrary(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string
): Promise<WorkflowTemplate[]> {
  const [starterTemplates, customTemplates] = await Promise.all([
    Promise.resolve(listStarterWorkflowTemplates()),
    listInstanceWorkflowTemplates(admin, instanceId, customerId),
  ]);

  return [...starterTemplates, ...customTemplates];
}

export async function resolveWorkflowTemplateForUse(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  templateId: string
): Promise<WorkflowTemplate | null> {
  const starterTemplate = getStarterWorkflowTemplateById(templateId);
  if (starterTemplate) {
    return starterTemplate;
  }

  const customTemplate = await getInstanceWorkflowTemplate(
    admin,
    instanceId,
    customerId,
    templateId
  );
  if (!customTemplate) {
    return null;
  }

  if (!isWorkflowTemplateVisibleToTenant(customTemplate, instanceId, customerId)) {
    return null;
  }

  return customTemplate;
}
