import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  canAdministerTenant,
  canManageTenantRuntimeData,
} from "@/lib/runtime/tenant-auth";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const tenantContextRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantContextRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to resolve tenant context",
    },
    async (state) => {
      return NextResponse.json({
        tenant: {
          id: state.tenantContext.tenantId,
          customer_id: state.tenantContext.customerId,
          slug: state.tenantContext.tenantSlug,
          name: state.tenantContext.tenantName,
          status: state.tenantContext.tenantStatus,
        },
        membership: {
          role: state.tenantContext.memberRole,
          status: state.tenantContext.memberStatus,
          can_manage_runtime_data: canManageTenantRuntimeData(
            state.tenantContext.memberRole
          ),
          can_admin_tenant: canAdministerTenant(state.tenantContext.memberRole),
        },
        runtime_gates: state.runtimeGates,
      });
    }
  );
}
