import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({ tenantId: z.uuid(), sessionId: z.uuid() });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; sessionId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or session ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to load conversation",
    },
    async ({ admin, tenantContext }) => {
      const [messagesResult, tracesResult] = await Promise.all([
        admin
          .from("tenant_messages")
          .select("id, direction, author_type, content, token_count, created_at")
          .eq("session_id", parsed.data.sessionId)
          .eq("tenant_id", tenantContext.tenantId)
          .order("created_at", { ascending: true })
          .limit(200),
        admin
          .from("tenant_conversation_traces")
          .select("id, trace_type, model_id, input_tokens, output_tokens, latency_ms, created_at")
          .eq("session_id", parsed.data.sessionId)
          .eq("tenant_id", tenantContext.tenantId)
          .order("created_at", { ascending: true }),
      ]);

      if (messagesResult.error) {
        return NextResponse.json({ error: messagesResult.error.message }, { status: 500 });
      }

      return NextResponse.json({
        messages: messagesResult.data || [],
        traces: tracesResult.data || [],
      });
    }
  );
}
