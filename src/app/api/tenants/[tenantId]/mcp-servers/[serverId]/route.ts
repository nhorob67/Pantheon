import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { updateMcpServerSchema } from "@/lib/validators/mcp-server";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantMcpContext,
  deleteTenantMcpServer,
  updateTenantMcpServer,
} from "@/lib/runtime/tenant-mcp";

const tenantMcpFileRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  serverId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; serverId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantMcpFileRouteParamsSchema,
    errorMessage: "Invalid tenant or MCP server ID",
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
      roleErrorMessage: "Insufficient role for tenant MCP server management",
      fallbackErrorMessage: "Failed to update tenant MCP server",
    },
    async (state) => {
      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (rateLimit === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsedBody = updateMcpServerSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantMcpContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const mcpServer = await updateTenantMcpServer(
        state.admin,
        context,
        parsedParams.data.serverId,
        parsedBody.data
      );

      const responseBody: Record<string, unknown> = {
        mcp_server: mcpServer,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "MCP server updated. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
        );
      }

      if (warnings.length > 0) {
        responseBody.warnings = warnings;
        responseBody.warning = warnings[0];
      }

      return NextResponse.json(responseBody);
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; serverId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantMcpFileRouteParamsSchema,
    errorMessage: "Invalid tenant or MCP server ID",
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
      roleErrorMessage: "Insufficient role for tenant MCP server management",
      fallbackErrorMessage: "Failed to delete tenant MCP server",
    },
    async (state) => {
      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
      if (rateLimit === "unavailable") {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (rateLimit === "blocked") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantMcpContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      await deleteTenantMcpServer(state.admin, context, parsedParams.data.serverId);

      const responseBody: Record<string, unknown> = {
        success: true,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "MCP server deleted. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
        );
      }

      if (warnings.length > 0) {
        responseBody.warnings = warnings;
        responseBody.warning = warnings[0];
      }

      return NextResponse.json(responseBody);
    }
  );
}
