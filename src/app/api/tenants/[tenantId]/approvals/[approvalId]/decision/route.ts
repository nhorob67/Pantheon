import { NextResponse } from "next/server.js";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  tenantApprovalDecisionRequestSchema,
  tenantApprovalDecisionRouteParamsSchema,
} from "@/lib/runtime/tenant-api-contracts";
import { hasMinimumTenantRole } from "@/lib/runtime/tenant-auth";
import { transitionTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { encodeToolContinuationToken } from "@/lib/runtime/tenant-runtime-tools";
import { auditLog } from "@/lib/security/audit";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; approvalId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantApprovalDecisionRouteParamsSchema,
    errorMessage: "Invalid approval route parameters",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for tenant approval decisions",
      fallbackErrorMessage: "Failed to process tenant approval decision",
    },
    async (state) => {
      const parsedBody = tenantApprovalDecisionRequestSchema.safeParse(await request.json());
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid decision payload", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const { data: approval, error } = await state.admin
        .from("tenant_approvals")
        .select("id, status, required_role, request_payload")
        .eq("id", parsedParams.data.approvalId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!approval) {
        return NextResponse.json({ error: "Approval not found" }, { status: 404 });
      }
      if (approval.status !== "pending") {
        return NextResponse.json(
          { error: "Approval is no longer pending" },
          { status: 409 }
        );
      }

      const requiredRole = approval.required_role as "owner" | "admin" | "operator" | "viewer";
      if (!hasMinimumTenantRole(state.tenantContext.memberRole, requiredRole)) {
        return NextResponse.json(
          { error: "Decision role requirement not met" },
          { status: 403 }
        );
      }

      const nowIso = new Date().toISOString();
      const decision = parsedBody.data.decision;
      const { data: updatedApproval, error: updateError } = await state.admin
        .from("tenant_approvals")
        .update({
          status: decision,
          decided_by: state.user.id,
          decided_at: nowIso,
          decision_payload: {
            decision,
            comment: parsedBody.data.comment || null,
            decided_by: state.user.id,
            decided_at: nowIso,
          },
        })
        .eq("id", parsedParams.data.approvalId)
        .select("id, status, request_payload")
        .single();

      if (updateError || !updatedApproval) {
        throw new Error(updateError?.message || "Failed to update approval");
      }

      const requestPayload =
        updatedApproval.request_payload &&
        typeof updatedApproval.request_payload === "object" &&
        !Array.isArray(updatedApproval.request_payload)
          ? (updatedApproval.request_payload as Record<string, unknown>)
          : {};
      const runId = typeof requestPayload.run_id === "string" ? requestPayload.run_id : null;
      const invocationId =
        typeof requestPayload.invocation_id === "string" ? requestPayload.invocation_id : null;
      const rawContinuationToken =
        typeof requestPayload.continuation_token === "string"
          ? requestPayload.continuation_token
          : null;
      const encodedContinuationToken =
        invocationId && rawContinuationToken
          ? encodeToolContinuationToken({
            invocation_id: invocationId,
            token: rawContinuationToken,
          })
          : null;

      if (invocationId) {
        await state.admin
          .from("tenant_tool_invocations")
          .update({
            status: decision === "approved" ? "approved" : "rejected",
            result_payload: {
              approval_id: updatedApproval.id,
              decision,
              continuation_token: encodedContinuationToken,
            },
            completed_at: decision === "rejected" ? nowIso : null,
            error_message:
              decision === "rejected"
                ? parsedBody.data.comment || "Tool invocation rejected"
                : null,
          })
          .eq("id", invocationId)
          .eq("tenant_id", state.tenantContext.tenantId);
      }

      if (runId) {
        const { data: runRow } = await state.admin
          .from("tenant_runtime_runs")
          .select("*")
          .eq("id", runId)
          .eq("tenant_id", state.tenantContext.tenantId)
          .maybeSingle();

        if (runRow) {
          const run = runRow as unknown as TenantRuntimeRun;
          if (decision === "approved" && run.status === "awaiting_approval") {
            await transitionTenantRuntimeRun(state.admin, run, "retry", {
              workerId: null,
              lockExpiresAt: null,
              metadataPatch: {
                resumed_after_approval: true,
                approval_id: updatedApproval.id,
                tool_resume_token: encodedContinuationToken,
                tool_resume_invocation_id: invocationId,
              },
            });
          }

          if (decision === "rejected" && run.status === "awaiting_approval") {
            await transitionTenantRuntimeRun(state.admin, run, "fail", {
              workerId: null,
              errorMessage: parsedBody.data.comment || "Rejected via tenant approval queue",
              metadataPatch: {
                approval_rejected: true,
                approval_id: updatedApproval.id,
              },
            });
          }
        }
      }

      auditLog({
        action:
          decision === "approved"
            ? "tenant.approval.approved"
            : "tenant.approval.rejected",
        actor: state.user.id,
        resource_type: "tenant_approval",
        resource_id: updatedApproval.id,
        details: {
          tenant_id: state.tenantContext.tenantId,
          run_id: runId,
          invocation_id: invocationId,
        },
      });

      return NextResponse.json({
        approval_id: updatedApproval.id,
        status: decision,
      });
    }
  );
}
