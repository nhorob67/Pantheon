import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { updateTenantSecret, deleteTenantSecret } from "@/lib/secrets/vault";
import { updateSecretSchema } from "@/lib/validators/secrets";
import { safeErrorMessage } from "@/lib/security/safe-error";

const tenantSecretParamsSchema = z.object({
  tenantId: z.uuid(),
  secretId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; secretId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantSecretParamsSchema,
    errorMessage: "Invalid tenant or secret ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for secrets management",
      fallbackErrorMessage: "Failed to update secret",
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
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsed = updateSecretSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      try {
        const secret = await updateTenantSecret(
          state.admin,
          state.tenantContext.tenantId,
          parsedParams.data.secretId,
          parsed.data
        );
        return NextResponse.json({ secret });
      } catch (err) {
        return NextResponse.json(
          { error: safeErrorMessage(err, "Failed to update secret") },
          { status: 500 }
        );
      }
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; secretId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantSecretParamsSchema,
    errorMessage: "Invalid tenant or secret ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "writes",
      requireManageRuntimeData: true,
      roleErrorMessage: "Insufficient role for secrets management",
      fallbackErrorMessage: "Failed to delete secret",
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

      try {
        await deleteTenantSecret(
          state.admin,
          state.tenantContext.tenantId,
          parsedParams.data.secretId
        );
        return NextResponse.json({ deleted: true });
      } catch (err) {
        return NextResponse.json(
          { error: safeErrorMessage(err, "Failed to delete secret") },
          { status: 500 }
        );
      }
    }
  );
}
