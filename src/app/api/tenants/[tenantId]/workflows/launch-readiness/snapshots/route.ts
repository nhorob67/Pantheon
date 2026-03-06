import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  workflowLaunchReadinessQuerySchema,
  workflowLaunchReadinessSnapshotsQuerySchema,
} from "@/lib/validators/workflow";
import {
  listWorkflowLaunchReadinessSnapshots,
  persistWorkflowLaunchReadinessSnapshot,
} from "@/lib/workflows/launch-readiness";
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
      fallbackErrorMessage:
        "Failed to load workflow launch readiness snapshot history",
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

      const query = new URL(request.url).searchParams;
      const parsedQuery =
        workflowLaunchReadinessSnapshotsQuerySchema.safeParse({
          limit: query.get("limit") || undefined,
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

      const snapshots = await listWorkflowLaunchReadinessSnapshots(
        state.admin,
        {
          customerId: state.tenantContext.customerId,
          instanceId,
          limit: parsedQuery.data.limit,
        }
      );

      return NextResponse.json({ snapshots });
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
      fallbackErrorMessage:
        "Failed to capture workflow launch readiness snapshot",
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

      const rawBody = (await request.json().catch(() => null)) as unknown;
      const parsedBody = workflowLaunchReadinessQuerySchema.safeParse(
        rawBody || {}
      );
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
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

      const snapshot = await persistWorkflowLaunchReadinessSnapshot(
        state.admin,
        {
          customerId: state.tenantContext.customerId,
          instanceId,
          timeframeDays: parsedBody.data.days,
          minSamplesPerMetric: parsedBody.data.min_samples,
          captureSource: "manual",
        }
      );

      return NextResponse.json({ snapshot }, { status: 201 });
    }
  );
}
