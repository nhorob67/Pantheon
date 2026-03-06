import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { auditLog } from "@/lib/security/audit";
import {
  workflowValidateRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  workflowId: z.uuid(),
});

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
      fallbackErrorMessage: "Failed to validate workflow",
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

      const { data: workflow } = await state.admin
        .from("workflow_definitions")
        .select("id, draft_graph")
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (!workflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
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

      const parsedRequest = workflowValidateRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
        );
      }

      const graph = parsedRequest.data.graph ?? workflow.draft_graph;
      const result = validateWorkflowGraph(graph);

      const { error: updateError } = await state.admin
        .from("workflow_definitions")
        .update({
          is_valid: result.valid,
          last_validation_errors: result.errors,
          last_validated_at: new Date().toISOString(),
          updated_by: state.user.id,
        })
        .eq("id", workflowId)
        .eq("instance_id", instanceId);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to persist validation result" },
          { status: 500 }
        );
      }

      auditLog({
        action: "workflow.validate",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          valid: result.valid,
          error_count: result.errors.length,
        },
      });

      return NextResponse.json({
        workflow_id: workflowId,
        valid: result.valid,
        error_count: result.errors.length,
        errors: result.errors,
      });
    }
  );
}
