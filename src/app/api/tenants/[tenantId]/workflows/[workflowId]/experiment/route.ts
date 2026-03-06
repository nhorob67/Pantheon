import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { auditLog } from "@/lib/security/audit";
import { workflowExperimentRequestSchema } from "@/lib/validators/workflow";
import { evaluateWorkflowExperiment } from "@/lib/workflows/experiments";
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
      fallbackErrorMessage: "Failed to evaluate workflow experiment",
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

      const parsedRequest = workflowExperimentRequestSchema.safeParse(body);
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

      const { data: workflow } = await state.admin
        .from("workflow_definitions")
        .select("id, name, draft_graph")
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

      const graph = parsedRequest.data.graph ?? workflow.draft_graph;
      const experiment = evaluateWorkflowExperiment({
        graph,
        variants: parsedRequest.data.variants,
        stopAtApproval: parsedRequest.data.stop_at_approval,
        maxSteps: parsedRequest.data.max_steps,
      });

      auditLog({
        action: "workflow.experiment.evaluate",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          workflow_name: workflow.name,
          variant_count: experiment.variants.length,
          winner_variant_id: experiment.winner_variant_id,
          ok: experiment.ok,
          validation_error_count: experiment.validation_errors.length,
        },
      });

      return NextResponse.json(experiment);
    }
  );
}
