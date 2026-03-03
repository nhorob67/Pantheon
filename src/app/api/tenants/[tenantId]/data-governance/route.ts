import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  resolveTenantDataGovernancePolicy,
  updateTenantDataGovernancePolicy,
} from "@/lib/runtime/tenant-data-governance";
import { auditLog } from "@/lib/security/audit";

const tenantDataGovernanceRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

const tenantDataGovernanceUpdateSchema = z
  .object({
    export_retention_days: z.number().int().min(1).max(30).optional(),
    memory_tombstone_retention_days: z.number().int().min(7).max(3650).optional(),
    deletion_guard_enabled: z.boolean().optional(),
    hard_delete_requires_owner: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one data governance field must be provided",
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantDataGovernanceRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to load tenant data governance policy",
    },
    async (state) => {
      const policy = await resolveTenantDataGovernancePolicy(
        state.admin,
        state.tenantContext.tenantId
      );
      auditLog({
        action: "tenant.data_governance.view",
        actor: state.user.id,
        resource_type: "tenant",
        resource_id: state.tenantContext.tenantId,
      });
      return NextResponse.json({ policy });
    }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantDataGovernanceRouteParamsSchema,
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
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for tenant data governance management",
      fallbackErrorMessage: "Failed to update tenant data governance policy",
    },
    async (state) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = tenantDataGovernanceUpdateSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const policy = await updateTenantDataGovernancePolicy(state.admin, {
        tenantId: state.tenantContext.tenantId,
        updates: parsedBody.data,
        updatedBy: state.user.id,
      });

      auditLog({
        action: "tenant.data_governance.updated",
        actor: state.user.id,
        resource_type: "tenant",
        resource_id: state.tenantContext.tenantId,
        details: {
          updated_fields: Object.keys(parsedBody.data),
        },
      });

      return NextResponse.json({ policy });
    }
  );
}
