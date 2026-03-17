import { NextResponse } from "next/server.js";
import { z } from "zod/v4";
import {
  parseTenantRouteParams,
  runTenantRoute,
} from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({
  tenantId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsedParams = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsedParams instanceof Response) return parsedParams;

  return runTenantRoute(
    request,
    {
      tenantId: parsedParams.data.tenantId,
      requestTraceId: parsedParams.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list guardrail events",
    },
    async (state) => {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") ?? undefined;
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);

      let query = state.admin
        .from("tenant_guardrail_events")
        .select("id, event_kind, tool_name, threshold, actual, action, message, created_at")
        .eq("tenant_id", state.tenantContext.tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch guardrail events" },
          { status: 500 }
        );
      }

      return NextResponse.json({ events: data ?? [] });
    }
  );
}
