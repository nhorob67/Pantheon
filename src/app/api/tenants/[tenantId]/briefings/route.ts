import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import {
  briefingConfigSchema,
  briefingTimeToCron,
  computeNextBriefingRun,
} from "@/lib/validators/briefing";

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
      fallbackErrorMessage: "Failed to load briefing config",
    },
    async ({ admin, tenantContext }) => {
      const { data, error } = await admin
        .from("tenant_scheduled_messages")
        .select("id, enabled, cron_expression, channel_id, metadata, next_run_at")
        .eq("tenant_id", tenantContext.tenantId)
        .eq("customer_id", tenantContext.customerId)
        .eq("schedule_key", "morning_briefing")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          config: null,
          message: "No briefing configured",
        });
      }

      const metadata = (data.metadata || {}) as Record<string, unknown>;
      return NextResponse.json({
        config: {
          enabled: data.enabled,
          send_time: metadata.send_time || "06:30",
          timezone: metadata.timezone || "America/Chicago",
          channel_id: data.channel_id || "",
          sections: metadata.briefing_sections || {
            weather: true,
            grain_bids: true,
            ticket_summary: false,
          },
        },
        next_run_at: data.next_run_at,
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
      fallbackErrorMessage: "Failed to save briefing config",
    },
    async ({ admin, tenantContext }) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const bodyParsed = briefingConfigSchema.safeParse(body);
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: "Invalid data", details: bodyParsed.error.flatten() },
          { status: 400 }
        );
      }

      const config = bodyParsed.data;
      const cronExpression = briefingTimeToCron(config.send_time, config.timezone);
      const nextRunAt = config.enabled
        ? computeNextBriefingRun(config.send_time, config.timezone)
        : null;

      const row = {
        tenant_id: tenantContext.tenantId,
        customer_id: tenantContext.customerId,
        schedule_key: "morning_briefing",
        enabled: config.enabled,
        cron_expression: cronExpression,
        channel_id: config.channel_id,
        next_run_at: nextRunAt,
        metadata: {
          send_time: config.send_time,
          timezone: config.timezone,
          briefing_sections: config.sections,
        },
      };

      const { error } = await admin
        .from("tenant_scheduled_messages")
        .upsert(row, { onConflict: "tenant_id,schedule_key" });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        saved: true,
        next_run_at: nextRunAt,
        cron_expression: cronExpression,
      });
    }
  );
}
