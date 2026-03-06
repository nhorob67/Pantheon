import { NextResponse } from "next/server";
import { z } from "zod/v4";
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
    async ({ admin, tenantContext }) => {
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
