import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { updateAgentSchema } from "@/lib/validators/agent";

import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  buildTenantAgentContext,
  deleteTenantRuntimeAgent,
  resolveCanonicalLegacyInstanceForTenant,
  updateTenantRuntimeAgent,
} from "@/lib/runtime/tenant-agents";

const tenantAgentRouteParamsSchema = z.object({
  tenantId: z.uuid(),
  agentId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantAgentRouteParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
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
      roleErrorMessage: "Insufficient role for tenant agent management",
      fallbackErrorMessage: "Failed to update tenant agent",
    },
    async (state) => {
      const rateLimit = await consumeAgentManagementRateLimit(state.user.id);
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

      const body = await request.json();
      const parsedBody = updateAgentSchema.safeParse(body);
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
      const context = buildTenantAgentContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const agent = await updateTenantRuntimeAgent(
        state.admin,
        context,
        parsedParams.data.agentId,
        parsedBody.data
      );

      const responseBody: Record<string, unknown> = {
        agent,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Agent updated. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
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
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantAgentRouteParamsSchema,
    errorMessage: "Invalid tenant or agent ID",
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
      roleErrorMessage: "Insufficient role for tenant agent management",
      fallbackErrorMessage: "Failed to delete tenant agent",
    },
    async (state) => {
      const rateLimit = await consumeAgentManagementRateLimit(state.user.id);
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
      const context = buildTenantAgentContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      await deleteTenantRuntimeAgent(state.admin, context, parsedParams.data.agentId);

      const responseBody: Record<string, unknown> = {
        success: true,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Agent deleted. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
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
