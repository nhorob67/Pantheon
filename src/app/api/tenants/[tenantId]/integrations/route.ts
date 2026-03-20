import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  listIntegrations,
  registerIntegration,
} from "@/lib/runtime/tenant-integrations";
import { integrationRegisterSchema } from "@/lib/validators/integration";

const tenantParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list integrations",
    },
    async (state) => {
      const url = new URL(request.url);
      const statusFilter = url.searchParams.get("status") as
        | "active"
        | "inactive"
        | "error"
        | null;

      const integrations = await listIntegrations(
        state.admin,
        state.tenantContext.tenantId,
        statusFilter ?? undefined
      );
      return NextResponse.json({ integrations });
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
    schema: tenantParamsSchema,
    errorMessage: "Invalid tenant ID",
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
      fallbackErrorMessage: "Failed to register integration",
    },
    async (state) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = integrationRegisterSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const integration = await registerIntegration({
        admin: state.admin,
        tenantId: state.tenantContext.tenantId,
        customerId: state.tenantContext.customerId,
        agentId: null,
        slug: parsed.data.slug,
        displayName: parsed.data.display_name,
        serviceType: parsed.data.service_type,
        baseUrl: parsed.data.base_url,
        connectorAccountId: parsed.data.connector_account_id,
        authMethod: parsed.data.auth_method,
        authHeader: parsed.data.auth_header,
        apiDocsUrl: parsed.data.api_docs_url,
        discoveredEndpoints: parsed.data.discovered_endpoints,
        capabilitiesSummary: parsed.data.capabilities_summary,
        config: parsed.data.config,
      });

      return NextResponse.json({ integration }, { status: 201 });
    }
  );
}
