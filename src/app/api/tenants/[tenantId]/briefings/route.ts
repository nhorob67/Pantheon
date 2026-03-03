import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";
import {
  briefingConfigSchema,
  briefingTimeToCron,
  computeNextBriefingRun,
} from "@/lib/validators/briefing";

async function authorizeTenantAccess(
  userId: string,
  customerId: string,
  tenantId: string
) {
  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    userId,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return null;
  }

  return tenantContext;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const { user, customerId } = await requireDashboardCustomer();
  const tenantContext = await authorizeTenantAccess(user.id, customerId, tenantId);
  if (!tenantContext) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const admin = createAdminClient();
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const { user, customerId } = await requireDashboardCustomer();
  const tenantContext = await authorizeTenantAccess(user.id, customerId, tenantId);
  if (!tenantContext) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = briefingConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const config = parsed.data;
  const cronExpression = briefingTimeToCron(config.send_time, config.timezone);
  const nextRunAt = config.enabled
    ? computeNextBriefingRun(config.send_time, config.timezone)
    : null;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("tenant_scheduled_messages")
    .select("id")
    .eq("tenant_id", tenantContext.tenantId)
    .eq("customer_id", tenantContext.customerId)
    .eq("schedule_key", "morning_briefing")
    .maybeSingle();

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

  if (existing) {
    const { error } = await admin
      .from("tenant_scheduled_messages")
      .update(row)
      .eq("id", existing.id)
      .eq("tenant_id", tenantContext.tenantId)
      .eq("customer_id", tenantContext.customerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("tenant_scheduled_messages")
      .insert(row);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    saved: true,
    next_run_at: nextRunAt,
    cron_expression: cronExpression,
  });
}
