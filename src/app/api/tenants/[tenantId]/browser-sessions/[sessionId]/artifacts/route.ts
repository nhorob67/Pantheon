import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";
import {
  loadBrowserArtifacts,
  getBrowserArtifactUrl,
} from "@/lib/runtime/browser-artifacts";

const routeParamsSchema = z.object({
  tenantId: z.uuid(),
  sessionId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; sessionId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant or session ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load browser artifacts",
    },
    async (state) => {
      const { data: session } = await state.admin
        .from("tenant_browser_sessions")
        .select("id")
        .eq("id", parsedParams.data.sessionId)
        .eq("tenant_id", state.tenantContext.tenantId)
        .maybeSingle();

      if (!session) {
        return NextResponse.json({ error: "Browser session not found" }, { status: 404 });
      }

      const artifacts = await loadBrowserArtifacts(
        state.admin,
        parsedParams.data.sessionId,
        state.tenantContext.tenantId
      );

      // Generate signed URLs for each artifact
      const withUrls = await Promise.all(
        artifacts.map(async (a) => ({
          ...a,
          signed_url: await getBrowserArtifactUrl(state.admin, a.storageKey),
          storage_key: a.storageKey,
        }))
      );

      return NextResponse.json({ artifacts: withUrls });
    }
  );
}
