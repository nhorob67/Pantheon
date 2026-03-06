import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { auditLog } from "@/lib/security/audit";
import {
  updateWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import {
  getInstanceWorkflowDetail,
  normalizeWorkflowDefinitionRow,
} from "@/lib/queries/workflows";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";
import { safeErrorMessage } from "@/lib/security/safe-error";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  workflowId: z.uuid(),
});

export async function GET(
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

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load workflow",
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

      const detail = await getInstanceWorkflowDetail(
        state.admin,
        instanceId,
        state.tenantContext.customerId,
        parsed.data.workflowId
      );

      if (!detail) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(detail);
    }
  );
}

export async function PUT(
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

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to update workflow",
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

      const bodyParsed = updateWorkflowRequestSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
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

      const { data: existingWorkflow, error: existingWorkflowError } =
        await state.admin
          .from("workflow_definitions")
          .select("id, name, description, draft_graph, tags, owner_id")
          .eq("id", parsed.data.workflowId)
          .eq("instance_id", instanceId)
          .eq("customer_id", state.tenantContext.customerId)
          .maybeSingle();

      if (existingWorkflowError) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              existingWorkflowError,
              "Failed to load workflow"
            ),
          },
          { status: 500 }
        );
      }

      if (!existingWorkflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const nextName = bodyParsed.data.name ?? existingWorkflow.name;
      const nextDescription =
        bodyParsed.data.description === undefined
          ? existingWorkflow.description
          : bodyParsed.data.description;
      const nextGraph =
        bodyParsed.data.graph ?? existingWorkflow.draft_graph;
      const nextTags =
        bodyParsed.data.tags === undefined
          ? Array.isArray(existingWorkflow.tags)
            ? existingWorkflow.tags
            : []
          : bodyParsed.data.tags;
      const nextOwnerId =
        bodyParsed.data.owner_id === undefined
          ? existingWorkflow.owner_id
          : bodyParsed.data.owner_id;
      const validationResult = validateWorkflowGraph(nextGraph);

      const { data, error } = await state.admin.rpc(
        "update_workflow_definition_draft_with_snapshot",
        {
          p_workflow_id: parsed.data.workflowId,
          p_instance_id: instanceId,
          p_customer_id: state.tenantContext.customerId,
          p_name: nextName,
          p_description: nextDescription,
          p_graph: nextGraph,
          p_expected_draft_version: bodyParsed.data.expected_draft_version,
          p_updated_by: state.user.id,
          p_is_valid: validationResult.valid,
          p_validation_errors: validationResult.errors,
          p_tags: nextTags,
          p_owner_id: nextOwnerId,
        }
      );

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "A workflow with this name already exists." },
            { status: 409 }
          );
        }

        if (error.code === "40001") {
          const { data: latest } = await state.admin
            .from("workflow_definitions")
            .select("draft_version")
            .eq("id", parsed.data.workflowId)
            .maybeSingle();

          return NextResponse.json(
            {
              error: "Workflow version conflict. Refresh and retry.",
              code: "WORKFLOW_VERSION_CONFLICT",
              current_draft_version: latest?.draft_version ?? null,
            },
            { status: 409 }
          );
        }

        if (error.code === "P0002") {
          return NextResponse.json(
            { error: "Workflow not found" },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            error: safeErrorMessage(error, "Failed to update workflow"),
          },
          { status: 500 }
        );
      }

      const workflowRow = Array.isArray(data) ? data[0] : data;
      if (!workflowRow) {
        return NextResponse.json(
          {
            error:
              "Workflow was updated, but response payload was empty.",
          },
          { status: 500 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        workflowRow as Parameters<
          typeof normalizeWorkflowDefinitionRow
        >[0]
      );

      auditLog({
        action: "workflow.update",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          draft_version: workflow.draft_version,
          expected_draft_version:
            bodyParsed.data.expected_draft_version,
          is_valid: workflow.is_valid,
          tags_count: workflow.tags.length,
          owner_id: workflow.owner_id,
        },
      });

      return NextResponse.json({ workflow });
    }
  );
}
