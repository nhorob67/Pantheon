import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { recordHeartbeatOperatorEvent } from "@/lib/heartbeat/events";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { upsertHeartbeatConfigSchema } from "@/lib/validators/heartbeat";

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
      fallbackErrorMessage: "Failed to fetch heartbeat config",
    },
    async ({ admin, tenantContext }) => {
      const { data: configs, error } = await admin
        .from("tenant_heartbeat_configs")
        .select("*")
        .eq("tenant_id", tenantContext.tenantId)
        .order("agent_id", { ascending: true, nullsFirst: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const defaultConfig = (configs || []).find(
        (c: { agent_id: string | null }) => c.agent_id === null
      );
      const agentOverrides = (configs || []).filter(
        (c: { agent_id: string | null }) => c.agent_id !== null
      );

      return NextResponse.json({
        default_config: defaultConfig || null,
        agent_overrides: agentOverrides,
      });
    }
  );
}

export async function PUT(
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
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to update heartbeat config",
    },
    async ({ admin, tenantContext, user }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const bodyParsed = upsertHeartbeatConfigSchema.safeParse(body);
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
        .is("agent_id", null)
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
            agent_id: null,
            enabled: bodyParsed.data.enabled,
            interval_minutes: bodyParsed.data.interval_minutes,
            timezone: bodyParsed.data.timezone,
            active_hours_start: bodyParsed.data.active_hours_start,
            active_hours_end: bodyParsed.data.active_hours_end,
            checks: bodyParsed.data.checks,
            custom_checks: bodyParsed.data.custom_checks,
            delivery_channel_id: bodyParsed.data.delivery_channel_id ?? null,
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
        actorUserId: user.id,
        eventType,
        summary: eventType === "paused"
          ? "Paused tenant-default heartbeat"
          : eventType === "resumed"
            ? "Resumed tenant-default heartbeat"
            : "Saved tenant-default heartbeat settings",
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
