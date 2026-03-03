import { NextResponse } from "next/server.js";
import { canExportTenantData } from "@/lib/runtime/tenant-auth";
import {
  tenantImportDryRunDataSchema,
  tenantImportDryRunRequestSchema,
  tenantRouteParamsSchema,
} from "@/lib/runtime/tenant-api-contracts";
import { runTenantImportDryRun } from "@/lib/runtime/tenant-import";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { auditLog } from "@/lib/security/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantRouteParamsSchema,
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
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to validate tenant import payload",
    },
    async (state) => {
      if (!canExportTenantData(state.tenantContext.memberRole)) {
        auditLog({
          action: "tenant.import.dry_run.denied",
          actor: state.user.id,
          resource_type: "tenant_import",
          resource_id: state.tenantContext.tenantId,
          details: {
            tenant_id: state.tenantContext.tenantId,
            member_role: state.tenantContext.memberRole,
          },
        });
        return NextResponse.json(
          { error: "Insufficient role for tenant import validation" },
          { status: 403 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = tenantImportDryRunRequestSchema.safeParse(body || {});
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const result = runTenantImportDryRun(
        state.tenantContext.tenantId,
        parsedBody.data
      );
      const validatedResult = tenantImportDryRunDataSchema.parse(result);

      auditLog({
        action: validatedResult.accepted
          ? "tenant.import.dry_run.accepted"
          : "tenant.import.dry_run.rejected",
        actor: state.user.id,
        resource_type: "tenant_import",
        resource_id: state.tenantContext.tenantId,
        details: {
          tenant_id: state.tenantContext.tenantId,
          accepted: validatedResult.accepted,
          records_total: validatedResult.summary.records_total,
          errors: validatedResult.summary.errors,
          warnings: validatedResult.summary.warnings,
        },
      });

      return NextResponse.json(
        {
          dry_run: validatedResult,
        },
        { status: validatedResult.accepted ? 200 : 422 }
      );
    }
  );
}
