import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  createWorkflowTemplateRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { normalizeWorkflowTemplateRow } from "@/lib/queries/workflow-templates";
import { listWorkflowTemplateLibrary } from "@/lib/workflows/templates";
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
      fallbackErrorMessage: "Failed to load workflow templates",
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

      const templates = await listWorkflowTemplateLibrary(
        state.admin,
        instanceId,
        state.tenantContext.customerId
      );

      return NextResponse.json({ templates });
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
      fallbackErrorMessage: "Failed to create workflow template",
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

      const bodyParsed = createWorkflowTemplateRequestSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const validationResult = validateWorkflowGraph(bodyParsed.data.graph);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: "Template graph is invalid.",
            validation_errors: validationResult.errors,
          },
          { status: 409 }
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

      const { data, error } = await state.admin.rpc(
        "create_workflow_template_with_version",
        {
          p_instance_id: instanceId,
          p_customer_id: state.tenantContext.customerId,
          p_name: bodyParsed.data.name,
          p_description: bodyParsed.data.description ?? null,
          p_graph: bodyParsed.data.graph,
          p_created_by: state.user.id,
          p_metadata: bodyParsed.data.metadata ?? {},
        }
      );

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "A template with this name already exists." },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: safeErrorMessage(error, "Failed to create workflow template") },
          { status: 500 }
        );
      }

      const templateRow = Array.isArray(data) ? data[0] : data;
      if (!templateRow) {
        return NextResponse.json(
          { error: "Template was created, but response payload was empty." },
          { status: 500 }
        );
      }

      const template = normalizeWorkflowTemplateRow(
        templateRow as Parameters<typeof normalizeWorkflowTemplateRow>[0]
      );

      auditLog({
        action: "workflow.template.create",
        actor: state.user.email || state.user.id,
        resource_type: "workflow_template",
        resource_id: template.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          template_kind: template.template_kind,
          latest_version: template.latest_version,
          is_valid: validationResult.valid,
        },
      });

      return NextResponse.json({ template }, { status: 201 });
    }
  );
}
