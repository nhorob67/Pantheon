import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { composioToolkitUpdateSchema } from "@/lib/validators/composio";
import { COMPOSIO_TOOLKITS } from "@/lib/composio/toolkits";

import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantComposioContext,
  getTenantComposioToolkits,
  updateTenantComposioToolkits,
} from "@/lib/runtime/tenant-composio";

const tenantComposioToolkitsRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantComposioToolkitsRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to load tenant Composio toolkits",
    },
    async (state) => {
      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantComposioContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const selected = await getTenantComposioToolkits(state.admin, context);

      const responseBody: Record<string, unknown> = {
        toolkits: COMPOSIO_TOOLKITS,
        selected,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for Composio toolkit sync.";
      }

      return NextResponse.json(responseBody);
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
    schema: tenantComposioToolkitsRouteParamsSchema,
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
      roleErrorMessage: "Insufficient role for tenant Composio management",
      fallbackErrorMessage: "Failed to update tenant Composio toolkits",
    },
    async (state) => {
      const rateLimit = await consumeComposioRateLimit(state.user.id);
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

      const parsedBody = composioToolkitUpdateSchema.safeParse(body);
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
      const context = buildTenantComposioContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const config = await updateTenantComposioToolkits(
        state.admin,
        context,
        parsedBody.data.selected_toolkits
      );

      const responseBody: Record<string, unknown> = {
        config,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Composio toolkits updated. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
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
