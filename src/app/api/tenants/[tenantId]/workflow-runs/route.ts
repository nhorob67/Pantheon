import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { listWorkflowRunsPage } from "@/lib/queries/workflow-runs";
import { listWorkflowRunsQuerySchema } from "@/lib/validators/workflow";
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
      fallbackErrorMessage: "Failed to load workflow runs",
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

      const searchParams = new URL(request.url).searchParams;
      const parsedQuery = listWorkflowRunsQuerySchema.safeParse({
        workflow_id: searchParams.get("workflow_id") || undefined,
        status: searchParams.get("status") || undefined,
        limit: searchParams.get("limit") || undefined,
        offset: searchParams.get("offset") || undefined,
        cursor: searchParams.get("cursor") || undefined,
        started_from: searchParams.get("started_from") || undefined,
        started_to: searchParams.get("started_to") || undefined,
        min_duration_seconds:
          searchParams.get("min_duration_seconds") || undefined,
        max_duration_seconds:
          searchParams.get("max_duration_seconds") || undefined,
      });

      if (!parsedQuery.success) {
        return NextResponse.json(
          {
            error: "Invalid query params",
            details: parsedQuery.error.flatten(),
          },
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

      const page = await listWorkflowRunsPage(state.admin, {
        instanceId,
        customerId: state.tenantContext.customerId,
        workflowId: parsedQuery.data.workflow_id,
        status: parsedQuery.data.status,
        limit: parsedQuery.data.limit,
        offset: parsedQuery.data.offset,
        cursor: parsedQuery.data.cursor,
        startedFrom: parsedQuery.data.started_from,
        startedTo: parsedQuery.data.started_to,
        minDurationSeconds: parsedQuery.data.min_duration_seconds,
        maxDurationSeconds: parsedQuery.data.max_duration_seconds,
      });

      return NextResponse.json({
        runs: page.runs,
        filters: {
          workflow_id: parsedQuery.data.workflow_id || null,
          status: parsedQuery.data.status || null,
          started_from: parsedQuery.data.started_from || null,
          started_to: parsedQuery.data.started_to || null,
          min_duration_seconds:
            parsedQuery.data.min_duration_seconds ?? null,
          max_duration_seconds:
            parsedQuery.data.max_duration_seconds ?? null,
        },
        pagination: {
          limit: parsedQuery.data.limit,
          offset: parsedQuery.data.offset,
          cursor: parsedQuery.data.cursor || null,
          next_cursor: page.nextCursor,
          returned: page.runs.length,
        },
      });
    }
  );
}
