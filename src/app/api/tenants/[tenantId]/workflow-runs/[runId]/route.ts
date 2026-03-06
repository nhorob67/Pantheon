import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { getWorkflowRunDetail } from "@/lib/queries/workflow-runs";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  runId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; runId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or run ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load workflow run",
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

      const detail = await getWorkflowRunDetail(
        state.admin,
        instanceId,
        state.tenantContext.customerId,
        parsed.data.runId
      );

      if (!detail) {
        return NextResponse.json(
          { error: "Workflow run not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(detail);
    }
  );
}
