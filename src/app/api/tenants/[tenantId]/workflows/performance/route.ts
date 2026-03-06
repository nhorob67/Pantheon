import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { recordTelemetryEvent } from "@/lib/queries/extensibility";
import {
  ingestWorkflowPerformanceMetricRequestSchema,
  workflowPerformanceSummaryQuerySchema,
} from "@/lib/validators/workflow";
import {
  evaluateWorkflowPerformanceGates,
  extractWorkflowWebVitalSamples,
  WORKFLOW_WEB_VITAL_EVENT_TYPE,
} from "@/lib/workflows/performance-gates";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({ tenantId: z.uuid() });

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
      fallbackErrorMessage: "Failed to store workflow performance metric",
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

      const rawBody = (await request.json().catch(() => null)) as unknown;
      const bodyParsed =
        ingestWorkflowPerformanceMetricRequestSchema.safeParse(rawBody);
      if (!bodyParsed.success) {
        return NextResponse.json(
          {
            error: "Invalid metric payload",
            details: bodyParsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      await recordTelemetryEvent(state.admin, {
        customerId: state.tenantContext.customerId,
        instanceId,
        eventType: WORKFLOW_WEB_VITAL_EVENT_TYPE,
        metadata: {
          metric_name: bodyParsed.data.metric_name,
          route_kind: bodyParsed.data.route_kind,
          value: bodyParsed.data.value,
          id: bodyParsed.data.id ?? null,
          rating: bodyParsed.data.rating ?? null,
          delta: bodyParsed.data.delta ?? null,
          navigation_type: bodyParsed.data.navigation_type ?? null,
          path: bodyParsed.data.path ?? null,
          source: bodyParsed.data.source ?? "web-vitals",
          sampled_at:
            bodyParsed.data.sampled_at ?? new Date().toISOString(),
        },
      });

      return NextResponse.json({ status: "accepted" }, { status: 202 });
    }
  );
}

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
      fallbackErrorMessage: "Failed to evaluate workflow performance gates",
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
        workflowPerformanceSummaryQuerySchema.safeParse({
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

      const since = new Date(
        Date.now() - parsedQuery.data.days * 24 * 60 * 60 * 1000
      );

      const { data, error } = await state.admin
        .from("telemetry_events")
        .select("created_at, metadata")
        .eq("customer_id", state.tenantContext.customerId)
        .eq("instance_id", instanceId)
        .eq("event_type", WORKFLOW_WEB_VITAL_EVENT_TYPE)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              error,
              "Failed to load workflow performance metrics"
            ),
          },
          { status: 500 }
        );
      }

      const samples = extractWorkflowWebVitalSamples(data || []);
      const summary = evaluateWorkflowPerformanceGates({
        samples,
        timeframeDays: parsedQuery.data.days,
        minSamplesPerMetric: parsedQuery.data.min_samples,
      });

      return NextResponse.json({
        summary,
        captured_samples: samples.length,
        window_started_at: since.toISOString(),
        generated_at: new Date().toISOString(),
      });
    }
  );
}
