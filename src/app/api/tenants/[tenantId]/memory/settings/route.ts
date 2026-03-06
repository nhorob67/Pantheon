import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { updateTenantMemorySettingsSchema } from "@/lib/validators/memory";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  buildTenantMemoryContext,
  getTenantMemorySettings,
  updateTenantMemorySettings,
} from "@/lib/runtime/tenant-memory";

const tenantMemorySettingsRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantMemorySettingsRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to load tenant memory settings",
    },
    async (state) => {
      const context = buildTenantMemoryContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId
      );
      const result = await getTenantMemorySettings(state.admin, context);

      return NextResponse.json(result);
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
    schema: tenantMemorySettingsRouteParamsSchema,
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
      roleErrorMessage: "Insufficient role for tenant memory settings management",
      fallbackErrorMessage: "Failed to update tenant memory settings",
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

      const parsedBody = updateTenantMemorySettingsSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedBody.error.flatten() },
          { status: 400 }
        );
      }

      const context = buildTenantMemoryContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId
      );
      const settings = await updateTenantMemorySettings(
        state.admin,
        context,
        parsedBody.data,
        state.user.email || state.user.id
      );

      return NextResponse.json({ settings });
    }
  );
}
