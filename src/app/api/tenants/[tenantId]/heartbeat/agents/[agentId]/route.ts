import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { recordHeartbeatOperatorEvent } from "@/lib/heartbeat/events";
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
    async ({ admin, tenantContext, user }) => {
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

      const { data: existingConfig } = await admin
        .from("tenant_heartbeat_configs")
        .select("id, enabled")
        .eq("tenant_id", tenantContext.tenantId)
        .eq("agent_id", parsed.data.agentId)
        .maybeSingle();

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
            cooldown_minutes: bodyParsed.data.cooldown_minutes,
            max_alerts_per_day: bodyParsed.data.max_alerts_per_day,
            digest_enabled: bodyParsed.data.digest_enabled,
            digest_window_minutes: bodyParsed.data.digest_window_minutes,
            reminder_interval_minutes: bodyParsed.data.reminder_interval_minutes,
            heartbeat_instructions: bodyParsed.data.heartbeat_instructions,
            next_run_at: nextRunAt,
          },
          { onConflict: "tenant_id,agent_id" }
        )
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const eventType = existingConfig
        ? existingConfig.enabled === bodyParsed.data.enabled
          ? "config_saved"
          : bodyParsed.data.enabled
            ? "resumed"
            : "paused"
        : bodyParsed.data.enabled
          ? "resumed"
          : "config_saved";

      await recordHeartbeatOperatorEvent({
        admin,
        tenantId: tenantContext.tenantId,
        customerId: tenantContext.customerId,
        configId: config.id as string,
        agentId: parsed.data.agentId,
        actorUserId: user.id,
        eventType,
        summary: eventType === "paused"
          ? "Paused heartbeat override"
          : eventType === "resumed"
            ? "Resumed heartbeat override"
            : "Saved heartbeat override settings",
        metadata: {
          digest_enabled: bodyParsed.data.digest_enabled,
          digest_window_minutes: bodyParsed.data.digest_window_minutes,
          interval_minutes: bodyParsed.data.interval_minutes,
        },
      });

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
    async ({ admin, tenantContext, user }) => {
      const { data: existingConfig } = await admin
        .from("tenant_heartbeat_configs")
        .select("id")
        .eq("tenant_id", tenantContext.tenantId)
        .eq("agent_id", parsed.data.agentId)
        .maybeSingle();

      const { error } = await admin
        .from("tenant_heartbeat_configs")
        .delete()
        .eq("tenant_id", tenantContext.tenantId)
        .eq("agent_id", parsed.data.agentId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (existingConfig) {
        await recordHeartbeatOperatorEvent({
          admin,
          tenantId: tenantContext.tenantId,
          customerId: tenantContext.customerId,
          configId: existingConfig.id as string,
          agentId: parsed.data.agentId,
          actorUserId: user.id,
          eventType: "config_saved",
          summary: "Removed heartbeat override",
        });
      }

      return NextResponse.json({ deleted: true });
    }
  );
}
