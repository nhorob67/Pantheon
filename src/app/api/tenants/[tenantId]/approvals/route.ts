import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const tenantApprovalsRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "expired", "canceled"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantApprovalsRouteParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) {
    return parsedParams;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list tenant approvals",
    },
    async (state) => {
      const url = new URL(request.url);
      const statusParam = approvalStatusSchema.safeParse(url.searchParams.get("status") || "pending");
      const status = statusParam.success ? statusParam.data : "pending";
      const limitParam = Number(url.searchParams.get("limit") || "50");
      const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, Math.floor(limitParam))) : 50;

      const { data, error } = await state.admin
        .from("tenant_approvals")
        .select("id, approval_type, status, required_role, requested_by, decided_by, tool_id, request_payload, decision_payload, expires_at, decided_at, created_at, updated_at")
        .eq("tenant_id", state.tenantContext.tenantId)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        approvals: data || [],
        status_filter: status,
        count: Array.isArray(data) ? data.length : 0,
      });
    }
  );
}
