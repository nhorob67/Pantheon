import { NextResponse } from "next/server.js";
import { canExportTenantData } from "@/lib/runtime/tenant-auth";
import { createTenantExportRequestSchema, tenantRouteParamsSchema } from "@/lib/runtime/tenant-api-contracts";
import {
  createTenantExport,
  listTenantExports,
  type TenantExportFormat,
  type TenantExportScope,
} from "@/lib/runtime/tenant-exports";
import {
  IDEMPOTENCY_HEADER,
  LEGACY_IDEMPOTENCY_HEADER,
} from "@/lib/runtime/tenant-idempotency";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { auditLog } from "@/lib/security/audit";

export async function GET(
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
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load tenant exports",
    },
    async (state) => {
      const exports = await listTenantExports(state.admin, state.tenantContext.tenantId);
      auditLog({
        action: "tenant.export.list",
        actor: state.user.id,
        resource_type: "tenant_export",
        resource_id: state.tenantContext.tenantId,
        details: {
          tenant_id: state.tenantContext.tenantId,
          export_count: exports.length,
        },
      });

      return NextResponse.json({
        exports,
      });
    }
  );
}

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
      fallbackErrorMessage: "Failed to queue tenant export",
    },
    async (state) => {
      if (!canExportTenantData(state.tenantContext.memberRole)) {
        auditLog({
          action: "tenant.export.denied",
          actor: state.user.id,
          resource_type: "tenant_export",
          resource_id: state.tenantContext.tenantId,
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = createTenantExportRequestSchema.safeParse(body || {});
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const idempotencyKey =
        request.headers.get(IDEMPOTENCY_HEADER)
        || request.headers.get(LEGACY_IDEMPOTENCY_HEADER)
        || `tenant-export:${state.requestTraceId}`;

      const created = await createTenantExport(state.admin, {
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        requestedBy: state.user.id,
        exportScope: parsedBody.data.export_scope as TenantExportScope,
        format: parsedBody.data.format as TenantExportFormat,
        includeBlobs: parsedBody.data.include_blobs,
        idempotencyKey,
      });
      auditLog({
        action: created.reused ? "tenant.export.reused" : "tenant.export.queued",
        actor: state.user.id,
        resource_type: "tenant_export",
        resource_id: created.export.id,
        details: {
          tenant_id: state.tenantContext.tenantId,
          export_scope: parsedBody.data.export_scope,
          format: parsedBody.data.format,
          include_blobs: parsedBody.data.include_blobs,
          reused: created.reused,
        },
      });

      return NextResponse.json(
        {
          export: created.export,
          job: created.job,
          reused: created.reused,
        },
        { status: created.reused ? 200 : 202 }
      );
    }
  );
}
