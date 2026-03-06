import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowApprovalActionRequestSchema } from "@/lib/validators/workflow";
import {
  applyWorkflowApprovalDecision,
  WorkflowApprovalDecisionError,
} from "@/lib/workflows/approval-decisions";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  approvalId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; approvalId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or approval ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to approve workflow approval",
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

      const parsedRequest = workflowApprovalActionRequestSchema.safeParse(body);
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

      try {
        const result = await applyWorkflowApprovalDecision({
          admin: state.admin,
          instanceId,
          customerId: state.tenantContext.customerId,
          approvalId: parsed.data.approvalId,
          actorUserId: state.user.id,
          decision: "approved",
          comment: parsedRequest.data.comment,
        });

        auditLog({
          action: "workflow.approval.approved",
          actor: state.user.email || state.user.id,
          resource_type: "workflow_approval",
          resource_id: result.approval.id,
          details: {
            customer_id: state.tenantContext.customerId,
            instance_id: instanceId,
            workflow_id: result.workflowId,
            run_id: result.runId,
            node_id: result.approval.node_id,
            comment: result.approval.decision_comment,
            run_status: result.runStatus,
            gate: result.gate,
          },
        });

        return NextResponse.json({
          approval: result.approval,
          run: {
            id: result.runId,
            status: result.runStatus,
          },
          gate: result.gate,
        });
      } catch (error) {
        if (error instanceof WorkflowApprovalDecisionError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status }
          );
        }

        return NextResponse.json(
          { error: safeErrorMessage(error, "Failed to approve workflow approval") },
          { status: 500 }
        );
      }
    }
  );
}
