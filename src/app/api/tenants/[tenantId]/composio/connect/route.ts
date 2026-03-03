import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { composioOAuthInitSchema } from "@/lib/validators/composio";
import { getComposioClient } from "@/lib/composio/client";
import { consumeComposioRateLimit } from "@/lib/security/user-rate-limit";
import { validateSameOriginUrl } from "@/lib/security/validate-redirect";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantComposioContext,
  initiateTenantComposioOAuth,
} from "@/lib/runtime/tenant-composio";

const tenantComposioConnectRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantComposioConnectRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to initiate tenant Composio OAuth",
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

      const parsedBody = composioOAuthInitSchema.safeParse(body);
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
      const origin = new URL(request.url).origin;
      const redirectUrl =
        parsedBody.data.redirect_url ||
        `${origin}/api/tenants/${state.tenantContext.tenantId}/composio/callback`;

      if (parsedBody.data.redirect_url && !validateSameOriginUrl(redirectUrl, request.url)) {
        return NextResponse.json(
          { error: "redirect_url must point to the same origin" },
          { status: 400 }
        );
      }

      const context = buildTenantComposioContext(
        state.tenantContext.tenantId,
        state.tenantContext.customerId,
        mapping.instanceId
      );
      const oauthResult = await initiateTenantComposioOAuth(
        state.admin,
        context,
        getComposioClient(),
        parsedBody.data.app_id,
        redirectUrl
      );

      const responseBody: Record<string, unknown> = {
        redirect_url: oauthResult.redirect_url,
        legacy_instance_id: mapping.instanceId,
      };

      if (mapping.ambiguous) {
        responseBody.warning =
          "Multiple active legacy instance mappings detected. Using most recent mapping for Composio OAuth callbacks.";
      }

      return NextResponse.json(responseBody);
    }
  );
}
