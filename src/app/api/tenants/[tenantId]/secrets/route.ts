import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { listTenantSecrets, createTenantSecret } from "@/lib/secrets/vault";
import { createSecretSchema } from "@/lib/validators/secrets";
import { safeErrorMessage } from "@/lib/security/safe-error";

const tenantSecretsParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantSecretsParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list secrets",
    },
    async (state) => {
      const [secrets, toolRow] = await Promise.all([
        listTenantSecrets(state.admin, state.tenantContext.tenantId),
        state.admin
          .from("tenant_tools")
          .select("status")
          .eq("tenant_id", state.tenantContext.tenantId)
          .eq("tool_key", "reveal_secret")
          .maybeSingle()
          .then(({ data }) => data),
      ]);
      return NextResponse.json({
        secrets,
        reveal_secret_status: toolRow?.status ?? null,
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
    schema: tenantSecretsParamsSchema,
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
      roleErrorMessage: "Insufficient role for secrets management",
      fallbackErrorMessage: "Failed to create secret",
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

      const parsed = createSecretSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      try {
        const secret = await createTenantSecret(
          state.admin,
          state.tenantContext.tenantId,
          state.tenantContext.customerId,
          parsed.data
        );
        return NextResponse.json({ secret }, { status: 201 });
      } catch (err) {
        const message = safeErrorMessage(err, "Failed to create secret");
        const isDuplicate =
          err instanceof Error && err.message.includes("tenant_secrets_label_unique");
        return NextResponse.json(
          { error: isDuplicate ? "A secret with this label already exists" : message },
          { status: isDuplicate ? 409 : 500 }
        );
      }
    }
  );
}
