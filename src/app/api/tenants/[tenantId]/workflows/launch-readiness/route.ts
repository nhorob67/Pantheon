import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { workflowLaunchReadinessQuerySchema } from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";
import { buildWorkflowLaunchReadinessSnapshot } from "@/lib/workflows/launch-readiness";

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
      fallbackErrorMessage: "Failed to load workflow launch readiness data",
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
      const parsedQuery = workflowLaunchReadinessQuerySchema.safeParse({
        days: query.get("days") || undefined,
        min_samples: query.get("min_samples") || undefined,
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

      const snapshot = await buildWorkflowLaunchReadinessSnapshot(
        state.admin,
        {
          customerId: state.tenantContext.customerId,
          instanceId,
          timeframeDays: parsedQuery.data.days,
          minSamplesPerMetric: parsedQuery.data.min_samples,
        }
      );

      return NextResponse.json({ snapshot });
    }
  );
}
