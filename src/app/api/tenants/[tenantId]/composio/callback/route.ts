import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import { getComposioClient } from "@/lib/composio/client";
import { escapeHtml } from "@/lib/security/escape-html";
import {
  parseTenantRouteParams,
  runTenantRoute,
  withTenantRequestTraceHeader,
} from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import {
  buildTenantComposioContext,
  syncTenantComposioConnections,
} from "@/lib/runtime/tenant-composio";

const tenantComposioCallbackRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

function callbackPage(message: string, success: boolean): string {
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html>
<head><title>FarmClaw - Composio</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#0f1209;color:#f0ece4">
  <h2>${success ? "Connected" : "Error"}</h2>
  <p>${safeMessage}</p>
  <p style="color:#888;font-size:14px">This window will close automatically.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "composio-oauth-complete", success: ${success} }, window.location.origin);
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}

function callbackResponse(
  requestTraceId: string,
  message: string,
  success: boolean,
  status: number
): NextResponse {
  return withTenantRequestTraceHeader(
    new NextResponse(callbackPage(message, success), {
      status,
      headers: { "Content-Type": "text/html" },
    }),
    requestTraceId
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: tenantComposioCallbackRouteParamsSchema,
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
      fallbackErrorMessage: "Failed to complete Composio callback",
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
      await syncTenantComposioConnections(state.admin, context, getComposioClient());

      return callbackResponse(state.requestTraceId, "Connection successful!", true, 200);
    }
  );
}
