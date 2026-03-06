import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  useWorkflowTemplateRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  buildWorkflowDraftFromTemplate,
  resolveWorkflowTemplateForUse,
} from "@/lib/workflows/templates";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  templateId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; templateId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or template ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to use workflow template",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const instanceId = mapping.instanceId;

      if (!instanceId) {
        return NextResponse.json(
          { error: "No instance mapping found" },
          { status: 404 }
        );
      }

      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

      if (rateLimit === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = useWorkflowTemplateRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
        );
      }

      const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
        state.admin,
        state.tenantContext.customerId
      );

      if (!workflowBuilderEnabled) {
        return NextResponse.json(
          { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      let template;
      try {
        template = await resolveWorkflowTemplateForUse(
          state.admin,
          instanceId,
          state.tenantContext.customerId,
          parsed.data.templateId
        );
      } catch (error) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Failed to load workflow template") },
          { status: 500 }
        );
      }

      if (!template) {
        return NextResponse.json(
          { error: "Workflow template not found" },
          { status: 404 }
        );
      }

      const draft = buildWorkflowDraftFromTemplate({
        template,
        name: parsedRequest.data.name,
        description: parsedRequest.data.description,
      });
      const nextTags = parsedRequest.data.tags ?? [];
      const nextOwnerId = parsedRequest.data.owner_id ?? state.user.id;
      const validationResult = validateWorkflowGraph(draft.graph);

      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: "Template graph is invalid.",
            validation_errors: validationResult.errors,
          },
          { status: 409 }
        );
      }

      const { data: createdWorkflow, error: createError } = await state.admin.rpc(
        "create_workflow_definition_with_snapshot",
        {
          p_instance_id: instanceId,
          p_customer_id: state.tenantContext.customerId,
          p_name: draft.name,
          p_description: draft.description,
          p_graph: draft.graph,
          p_created_by: state.user.id,
          p_is_valid: validationResult.valid,
          p_validation_errors: validationResult.errors,
          p_tags: nextTags,
          p_owner_id: nextOwnerId,
        }
      );

      if (createError) {
        if (createError.code === "23505") {
          return NextResponse.json(
            { error: "A workflow with this name already exists." },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: safeErrorMessage(createError, "Failed to create workflow") },
          { status: 500 }
        );
      }

      const workflowRow = Array.isArray(createdWorkflow)
        ? createdWorkflow[0]
        : createdWorkflow;
      if (!workflowRow) {
        return NextResponse.json(
          { error: "Workflow was created, but response payload was empty." },
          { status: 500 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
      );

      auditLog({
        action: "workflow.template.use",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          template_id: template.id,
          template_name: template.name,
          template_kind: template.template_kind,
          template_version: template.latest_version,
          draft_version: workflow.draft_version,
          template_metadata: draft.metadata,
          tags_count: workflow.tags.length,
          owner_id: workflow.owner_id,
        },
      });

      return NextResponse.json(
        {
          workflow,
          template: {
            id: template.id,
            name: template.name,
            template_kind: template.template_kind,
          },
        },
        { status: 201 }
      );
    }
  );
}
