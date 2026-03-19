import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  getIntegration,
  updateIntegration,
  deleteIntegration,
} from "@/lib/runtime/tenant-integrations";
import { integrationUpdateSchema } from "@/lib/validators/integration";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  integrationId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; integrationId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid parameters",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to get integration",
    },
    async (state) => {
      const integration = await getIntegration(
        state.admin,
        state.tenantContext.tenantId,
        parsedParams.data.integrationId
      );

      if (!integration) {
        return NextResponse.json({ error: "Integration not found" }, { status: 404 });
      }

      return NextResponse.json({ integration });
    }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; integrationId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid parameters",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for integration management",
      fallbackErrorMessage: "Failed to update integration",
    },
    async (state) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = integrationUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const integration = await updateIntegration(
        state.admin,
        state.tenantContext.tenantId,
        parsedParams.data.integrationId,
        parsed.data
      );

      return NextResponse.json({ integration });
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; integrationId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid parameters",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for integration management",
      fallbackErrorMessage: "Failed to delete integration",
    },
    async (state) => {
      await deleteIntegration(
        state.admin,
        state.tenantContext.tenantId,
        parsedParams.data.integrationId
      );

      return NextResponse.json({ success: true });
    }
  );
}
