import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { auditLog } from "@/lib/security/audit";
import {
  createWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { EMPTY_WORKFLOW_GRAPH } from "@/types/workflow";
import {
  listInstanceWorkflows,
  normalizeWorkflowDefinitionRow,
} from "@/lib/queries/workflows";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list workflows",
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

      const workflows = await listInstanceWorkflows(
        state.admin,
        instanceId,
        state.tenantContext.customerId
      );

      return NextResponse.json({ workflows });
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to create workflow",
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

      const bodyParsed = createWorkflowRequestSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const graph = bodyParsed.data.graph ?? EMPTY_WORKFLOW_GRAPH;
      const validationResult = validateWorkflowGraph(graph);

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

      const { data, error } = await state.admin.rpc(
        "create_workflow_definition_with_snapshot",
        {
          p_instance_id: instanceId,
          p_customer_id: state.tenantContext.customerId,
          p_name: bodyParsed.data.name,
          p_description: bodyParsed.data.description ?? null,
          p_graph: graph,
          p_created_by: state.user.id,
          p_is_valid: validationResult.valid,
          p_validation_errors: validationResult.errors,
          p_tags: bodyParsed.data.tags ?? [],
          p_owner_id: bodyParsed.data.owner_id ?? state.user.id,
        }
      );

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "A workflow with this name already exists." },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: "Failed to create workflow" },
          { status: 500 }
        );
      }

      const workflowRow = Array.isArray(data) ? data[0] : data;
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
        action: "workflow.create",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
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
