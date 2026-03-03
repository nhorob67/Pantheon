import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { canExportTenantData } from "@/lib/runtime/tenant-auth";
import { retryTenantExport } from "@/lib/runtime/tenant-exports";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { auditLog } from "@/lib/security/audit";

const retryTenantExportRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  exportId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; exportId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: retryTenantExportRouteParamsSchema,
    errorMessage: "Invalid tenant export retry path",
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
      fallbackErrorMessage: "Failed to retry tenant export",
    },
    async (state) => {
      if (!canExportTenantData(state.tenantContext.memberRole)) {
        auditLog({
          action: "tenant.export.retry_denied",
          actor: state.user.id,
          resource_type: "tenant_export",
          resource_id: parsedParams.data.exportId,
          details: {
            tenant_id: state.tenantContext.tenantId,
            member_role: state.tenantContext.memberRole,
          },
        });
        return NextResponse.json(
          { error: "Insufficient role for tenant export management" },
          { status: 403 }
        );
      }

      const retried = await retryTenantExport(state.admin, {
        tenantId: state.tenantContext.tenantId,
        exportId: parsedParams.data.exportId,
        userId: state.user.id,
      });
      auditLog({
        action: "tenant.export.retry_queued",
        actor: state.user.id,
        resource_type: "tenant_export",
        resource_id: retried.export.id,
        details: {
          tenant_id: state.tenantContext.tenantId,
          export_status: retried.export.status,
          job_id: retried.job.id,
        },
      });

      return NextResponse.json(
        {
          export: retried.export,
          job: retried.job,
        },
        { status: 202 }
      );
    }
  );
}
