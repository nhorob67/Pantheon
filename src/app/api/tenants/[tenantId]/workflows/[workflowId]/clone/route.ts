import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  cloneWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  workflowId: z.uuid(),
});

function withCloneSuffix(baseName: string, attempt: number): string {
  if (attempt === 0) {
    return `${baseName} (Copy)`;
  }
  return `${baseName} (Copy ${attempt + 1})`;
}

async function resolveUniqueCloneName(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  instanceId: string,
  customerId: string,
  sourceName: string,
  explicitName?: string
): Promise<string> {
  if (explicitName) {
    return explicitName;
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = withCloneSuffix(sourceName, attempt);
    const { data: existing } = await admin
      .from("workflow_definitions")
      .select("id")
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .eq("name", candidate)
      .maybeSingle();

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique clone name.");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; workflowId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or workflow ID",
  });
  if (parsed instanceof Response) return parsed;

  const { tenantId, workflowId } = parsed.data;

  return runTenantRoute(
    request,
    {
      tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to clone workflow",
    },
    async (state) => {
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

      let body: unknown = {};
      try {
        const rawBody = await request.text();
        if (rawBody.trim().length > 0) {
          body = JSON.parse(rawBody);
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = cloneWorkflowRequestSchema.safeParse(body);
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

      const { data: sourceWorkflow, error: sourceWorkflowError } = await state.admin
        .from("workflow_definitions")
        .select("id, name, description, draft_graph, tags, owner_id")
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (sourceWorkflowError) {
        return NextResponse.json(
          { error: safeErrorMessage(sourceWorkflowError, "Failed to load workflow") },
          { status: 500 }
        );
      }

      if (!sourceWorkflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const nextName = await resolveUniqueCloneName(
        state.admin,
        instanceId,
        state.tenantContext.customerId,
        sourceWorkflow.name,
        parsedRequest.data.name
      );
      const validationResult = validateWorkflowGraph(sourceWorkflow.draft_graph);

      const { data: createdWorkflow, error: createError } = await state.admin.rpc(
        "create_workflow_definition_with_snapshot",
        {
          p_instance_id: instanceId,
          p_customer_id: state.tenantContext.customerId,
          p_name: nextName,
          p_description: sourceWorkflow.description,
          p_graph: sourceWorkflow.draft_graph,
          p_created_by: state.user.id,
          p_is_valid: validationResult.valid,
          p_validation_errors: validationResult.errors,
          p_tags: Array.isArray(sourceWorkflow.tags) ? sourceWorkflow.tags : [],
          p_owner_id: sourceWorkflow.owner_id ?? state.user.id,
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
          { error: safeErrorMessage(createError, "Failed to clone workflow") },
          { status: 500 }
        );
      }

      const workflowRow = Array.isArray(createdWorkflow)
        ? createdWorkflow[0]
        : createdWorkflow;
      if (!workflowRow) {
        return NextResponse.json(
          { error: "Workflow was cloned, but response payload was empty." },
          { status: 500 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
      );

      auditLog({
        action: "workflow.clone",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          source_workflow_id: workflowId,
          source_workflow_name: sourceWorkflow.name,
          cloned_workflow_name: workflow.name,
          draft_version: workflow.draft_version,
          is_valid: workflow.is_valid,
          tags_count: workflow.tags.length,
          owner_id: workflow.owner_id,
        },
      });

      return NextResponse.json({ workflow }, { status: 201 });
    }
  );
}
