import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to list conversations",
    },
    async ({ admin, tenantContext }) => {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);

      const { data: sessions, error } = await admin
        .from("tenant_sessions")
        .select("id, session_kind, status, rolling_summary, created_at, updated_at, tenant_messages(count)")
        .eq("tenant_id", tenantContext.tenantId)
        .eq("customer_id", tenantContext.customerId)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const sessionsWithCounts = (sessions || []).map((s) => {
        const msgCount = Array.isArray(s.tenant_messages)
          ? (s.tenant_messages[0] as { count: number } | undefined)?.count ?? 0
          : 0;
        const { tenant_messages: _, ...rest } = s;
        return { ...rest, message_count: msgCount };
      });

      return NextResponse.json({ sessions: sessionsWithCounts });
    }
  );
}
