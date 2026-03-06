import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { buildWorkflowExportDocument } from "@/lib/workflows/import-export";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

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

  const { tenantId, workflowId } = parsed.data;

  return runTenantRoute(
    request,
    {
      tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to export workflow",
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

      const { data: workflowRow, error: workflowError } = await state.admin
        .from("workflow_definitions")
        .select(
          "id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at"
        )
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (workflowError) {
        return NextResponse.json(
          { error: safeErrorMessage(workflowError, "Failed to load workflow") },
          { status: 500 }
        );
      }

      if (!workflowRow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
      );
      const document = buildWorkflowExportDocument(workflow);

      auditLog({
        action: "workflow.export",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          draft_version: workflow.draft_version,
          tags_count: workflow.tags.length,
          owner_id: workflow.owner_id,
        },
      });

      return NextResponse.json(document, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${workflow.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "workflow"}-export.json"`,
        },
      });
    }
  );
}
