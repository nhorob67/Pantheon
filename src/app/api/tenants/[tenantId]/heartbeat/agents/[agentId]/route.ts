import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { upsertAgentHeartbeatOverrideSchema } from "@/lib/validators/heartbeat";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  agentId: z.uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to update agent heartbeat override",
    },
    async ({ admin, tenantContext }) => {
      // Verify agent belongs to tenant
      const { data: agent } = await admin
        .from("tenant_agents")
        .select("id")
        .eq("id", parsed.data.agentId)
        .eq("tenant_id", tenantContext.tenantId)
        .maybeSingle();

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const bodyParsed = upsertAgentHeartbeatOverrideSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const nextRunAt = bodyParsed.data.enabled
        ? new Date(
            Date.now() + bodyParsed.data.interval_minutes * 60 * 1000
          ).toISOString()
        : null;

      const { data: config, error } = await admin
        .from("tenant_heartbeat_configs")
        .upsert(
          {
            tenant_id: tenantContext.tenantId,
            customer_id: tenantContext.customerId,
            agent_id: parsed.data.agentId,
            enabled: bodyParsed.data.enabled,
            interval_minutes: bodyParsed.data.interval_minutes,
            timezone: bodyParsed.data.timezone,
            active_hours_start: bodyParsed.data.active_hours_start,
            active_hours_end: bodyParsed.data.active_hours_end,
            checks: bodyParsed.data.checks,
            delivery_channel_id: bodyParsed.data.delivery_channel_id ?? null,
            custom_checks: bodyParsed.data.custom_checks,
            next_run_at: nextRunAt,
          },
          { onConflict: "tenant_id,agent_id" }
        )
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ config });
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or agent ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to delete agent heartbeat override",
    },
    async ({ admin, tenantContext }) => {
      const { error } = await admin
        .from("tenant_heartbeat_configs")
        .delete()
        .eq("tenant_id", tenantContext.tenantId)
        .eq("agent_id", parsed.data.agentId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ deleted: true });
    }
  );
}
