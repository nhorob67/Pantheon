import { NextResponse } from "next/server.js";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  tenantApprovalDecisionRequestSchema,
  tenantApprovalDecisionRouteParamsSchema,
} from "@/lib/runtime/tenant-api-contracts";
import { executeTenantApprovalDecision } from "@/lib/runtime/tenant-approval-executor";

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

      const result = await executeTenantApprovalDecision(state.admin, {
        tenantId: state.tenantContext.tenantId,
        approvalId: parsedParams.data.approvalId,
        decidedByUserId: state.user.id,
        decidedByRole: state.tenantContext.memberRole,
        decision: parsedBody.data.decision,
        comment: parsedBody.data.comment,
        requestTraceId: state.requestTraceId,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.httpStatus }
        );
      }

      return NextResponse.json({
        approval_id: result.approval_id,
        status: result.status,
      });
    }
  );
}
