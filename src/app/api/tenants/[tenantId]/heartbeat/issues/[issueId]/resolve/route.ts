import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { recordHeartbeatOperatorEvent } from "@/lib/heartbeat/events";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  issueId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; issueId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or issue ID",
  });
  if (parsed instanceof Response) {
    return parsed;
  }

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to resolve heartbeat issue",
    },
    async ({ admin, tenantContext, user }) => {
      const { data: issue, error } = await admin
        .from("tenant_heartbeat_signals")
        .update({
          state: "resolved",
          resolved_at: new Date().toISOString(),
          snoozed_until: null,
        })
        .eq("id", parsed.data.issueId)
        .eq("tenant_id", tenantContext.tenantId)
        .is("resolved_at", null)
        .select("*")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!issue) {
        return NextResponse.json(
          { error: "Heartbeat issue not found" },
          { status: 404 }
        );
      }

      await recordHeartbeatOperatorEvent({
        admin,
        tenantId: tenantContext.tenantId,
        customerId: tenantContext.customerId,
        configId: issue.config_id as string,
        agentId: issue.agent_id as string | null,
        actorUserId: user.id,
        eventType: "issue_resolved",
        summary: "Resolved heartbeat issue",
        metadata: {
          issue_id: issue.id,
          signal_type: issue.signal_type,
        },
      });

      return NextResponse.json({ issue });
    }
  );
}
