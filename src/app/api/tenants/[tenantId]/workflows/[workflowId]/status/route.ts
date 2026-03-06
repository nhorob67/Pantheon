import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowStatusMutationRequestSchema } from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const WORKFLOW_SELECT_COLUMNS =
  "id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  workflowId: z.uuid(),
});

export async function PATCH(
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
      fallbackErrorMessage: "Failed to update workflow status",
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

      const rawBody = (await request.json().catch(() => null)) as unknown;
      const parsedRequest = workflowStatusMutationRequestSchema.safeParse(rawBody);
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

      const { data: existingWorkflow, error: existingWorkflowError } = await state.admin
        .from("workflow_definitions")
        .select("id, status, published_version")
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (existingWorkflowError) {
        return NextResponse.json(
          { error: safeErrorMessage(existingWorkflowError, "Failed to load workflow") },
          { status: 500 }
        );
      }

      if (!existingWorkflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const nextStatus = parsedRequest.data.archived
        ? "archived"
        : existingWorkflow.published_version
          ? "published"
          : "draft";

      const { data: updatedWorkflowRow, error: updateError } = await state.admin
        .from("workflow_definitions")
        .update({
          status: nextStatus,
          updated_by: state.user.id,
        })
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .select(WORKFLOW_SELECT_COLUMNS)
        .maybeSingle();

      if (updateError) {
        return NextResponse.json(
          { error: safeErrorMessage(updateError, "Failed to update workflow status") },
          { status: 500 }
        );
      }

      if (!updatedWorkflowRow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        updatedWorkflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
      );

      const action = parsedRequest.data.archived ? "workflow.archive" : "workflow.unarchive";
      auditLog({
        action,
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          reason: parsedRequest.data.reason ?? null,
          next_status: workflow.status,
          published_version: workflow.published_version,
        },
      });

      return NextResponse.json({
        workflow,
        message: parsedRequest.data.archived
          ? "Workflow archived."
          : "Workflow restored from archive.",
      });
    }
  );
}
