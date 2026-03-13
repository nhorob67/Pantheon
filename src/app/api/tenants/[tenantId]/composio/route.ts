import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { getComposioClient } from "@/lib/composio/client";
import { updateComposioSchema } from "@/lib/validators/composio";

import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantComposioContext,
  deleteTenantComposioIntegration,
  enableTenantComposioIntegration,
  getTenantComposioConfig,
  updateTenantComposioIntegration,
} from "@/lib/runtime/tenant-composio";

const enableTenantComposioSchema = z
  .object({
    instance_id: z.uuid().optional(),
  })
  .strict();

const tenantComposioRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantComposioRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to load tenant Composio config",
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
      const config = await getTenantComposioConfig(state.admin, context);

      const responseBody: Record<string, unknown> = {
        config,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for Composio config sync.";
      }

      return NextResponse.json(responseBody);
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
    schema: tenantComposioRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to enable tenant Composio integration",
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

      let body: unknown = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const parsedBody = enableTenantComposioSchema.safeParse(body);
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
      const config = await enableTenantComposioIntegration(
        state.admin,
        context,
        getComposioClient()
      );

      const responseBody: Record<string, unknown> = {
        config,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Composio enabled. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
        );
      }

      if (warnings.length > 0) {
        responseBody.warnings = warnings;
        responseBody.warning = warnings[0];
      }

      return NextResponse.json(responseBody, { status: 201 });
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
    schema: tenantComposioRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to update tenant Composio integration",
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

      const parsedBody = updateComposioSchema.safeParse(body);
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
      const config = await updateTenantComposioIntegration(
        state.admin,
        context,
        parsedBody.data
      );

      const responseBody: Record<string, unknown> = {
        config,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Composio updated. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
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
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantComposioRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to remove tenant Composio integration",
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

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const context = buildTenantComposioContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      await deleteTenantComposioIntegration(state.admin, context);

      const responseBody: Record<string, unknown> = {
        success: true,
        legacy_instance_id: mapping.instanceId,
      };
      const warnings: string[] = [];

      if (mapping.ambiguous) {
        warnings.push(
          "Composio removed. Multiple active legacy instance mappings detected; using most recent mapping for deploy sync."
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
