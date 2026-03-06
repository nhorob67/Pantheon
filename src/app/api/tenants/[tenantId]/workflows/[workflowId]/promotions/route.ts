import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowPromotionRequestSchema } from "@/lib/validators/workflow";
import {
  getWorkflowPromotionState,
  promoteWorkflowEnvironment,
  resolvePromotionReadiness,
  resolvePromotionSummary,
} from "@/lib/workflows/promotions";
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
      fallbackErrorMessage: "Failed to load workflow promotion state",
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
        .select("id")
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

      try {
        const promotionState = await getWorkflowPromotionState(
          state.admin,
          instanceId,
          state.tenantContext.customerId,
          workflowId
        );

        return NextResponse.json({
          state: promotionState,
          summary: resolvePromotionSummary(promotionState),
          readiness: resolvePromotionReadiness(promotionState),
        });
      } catch (error) {
        return NextResponse.json(
          { error: safeErrorMessage(error, "Failed to load workflow promotion state") },
          { status: 500 }
        );
      }
    }
  );
}

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
      fallbackErrorMessage: "Failed to promote workflow environment",
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = workflowPromotionRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
        );
      }

      try {
        const result = await promoteWorkflowEnvironment({
          admin: state.admin,
          instanceId,
          customerId: state.tenantContext.customerId,
          workflowId,
          targetEnvironment: parsedRequest.data.target_environment,
          sourceVersion: parsedRequest.data.source_version,
          note: parsedRequest.data.note,
          metadata: parsedRequest.data.metadata,
          actorId: state.user.id,
        });

        auditLog({
          action: "workflow.environment.promote",
          actor: state.user.email || state.user.id,
          resource_type: "workflow",
          resource_id: workflowId,
          details: {
            customer_id: state.tenantContext.customerId,
            instance_id: instanceId,
            tenant_id: tenantId,
            target_environment: parsedRequest.data.target_environment,
            promoted_version: result.promoted_version.version,
            source_environment: result.promoted_version.source_environment,
          },
        });

        return NextResponse.json({
          promoted_version: result.promoted_version,
          event: result.event,
          state: result.state,
          summary: resolvePromotionSummary(result.state),
          readiness: resolvePromotionReadiness(result.state),
        });
      } catch (error) {
        const message = safeErrorMessage(error, "Failed to promote workflow environment");
        const status =
          message.includes("not found") || message.includes("Not found") ? 404 : 409;

        return NextResponse.json(
          {
            error: message,
          },
          { status }
        );
      }
    }
  );
}
