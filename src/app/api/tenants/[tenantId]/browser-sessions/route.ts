import { NextResponse } from "next/server.js";
import { z } from "zod/v4";

import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const routeParamsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: routeParamsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load browser sessions",
    },
    async (state) => {
      const url = new URL(request.url);
      const runId = url.searchParams.get("run_id");
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      let query = state.admin
        .from("tenant_browser_sessions")
        .select("*", { count: "exact" })
        .eq("tenant_id", state.tenantContext.tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (runId) {
        query = query.eq("run_id", runId);
      }

      const { data, count, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        sessions: data ?? [],
        total: count ?? 0,
      });
    }
  );
}
