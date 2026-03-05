import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";
import { updateCustomScheduleSchema } from "@/lib/validators/schedule";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const { tenantId, scheduleId } = await params;
  const { user, customerId } = await requireDashboardCustomer();

  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    user.id,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: schedule, error } = await admin
    .from("tenant_scheduled_messages")
    .select(
      "id, schedule_key, cron_expression, timezone, enabled, last_run_at, next_run_at, agent_id, channel_id, metadata, schedule_type, display_name, prompt, tools, created_by, created_at, updated_at, tenant_agents(display_name)"
    )
    .eq("id", scheduleId)
    .eq("tenant_id", tenantContext.tenantId)
    .maybeSingle();

  if (error || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json({ schedule });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const { tenantId, scheduleId } = await params;
  const { user, customerId } = await requireDashboardCustomer();

  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    user.id,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Verify schedule exists and is custom
  const { data: existing, error: fetchError } = await admin
    .from("tenant_scheduled_messages")
    .select("id, schedule_type, cron_expression, timezone")
    .eq("id", scheduleId)
    .eq("tenant_id", tenantContext.tenantId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  if (existing.schedule_type !== "custom") {
    return NextResponse.json(
      { error: "Only custom schedules can be edited" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCustomScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.display_name !== undefined) update.display_name = parsed.data.display_name;
  if (parsed.data.prompt !== undefined) update.prompt = parsed.data.prompt;
  if (parsed.data.tools !== undefined) update.tools = parsed.data.tools;
  if (parsed.data.enabled !== undefined) update.enabled = parsed.data.enabled;

  if (parsed.data.cron_expression !== undefined) {
    update.cron_expression = parsed.data.cron_expression;
  }
  if (parsed.data.timezone !== undefined) {
    update.timezone = parsed.data.timezone;
  }

  // Recompute next_run_at if cron or timezone changed, or if re-enabling
  const cronChanged = parsed.data.cron_expression !== undefined;
  const tzChanged = parsed.data.timezone !== undefined;
  const enabling = parsed.data.enabled === true;

  if (cronChanged || tzChanged || enabling) {
    const cron = parsed.data.cron_expression ?? existing.cron_expression;
    const tz = parsed.data.timezone ?? existing.timezone;
    const shouldBeEnabled = parsed.data.enabled ?? true;
    update.next_run_at = shouldBeEnabled ? computeNextRun(cron, tz) : null;
  }

  if (parsed.data.enabled === false) {
    update.next_run_at = null;
  }

  const { data: updated, error: updateError } = await admin
    .from("tenant_scheduled_messages")
    .update(update)
    .eq("id", scheduleId)
    .select("id, schedule_key, cron_expression, timezone, enabled, next_run_at, schedule_type, display_name, prompt, tools, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; scheduleId: string }> }
) {
  const { tenantId, scheduleId } = await params;
  const { user, customerId } = await requireDashboardCustomer();

  const supabase = await createClient();
  const tenantContext = await resolveAuthorizedTenantContext(
    supabase,
    user.id,
    tenantId
  );

  if (!tenantContext || tenantContext.customerId !== customerId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Verify schedule exists and is custom
  const { data: existing, error: fetchError } = await admin
    .from("tenant_scheduled_messages")
    .select("id, schedule_type")
    .eq("id", scheduleId)
    .eq("tenant_id", tenantContext.tenantId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  if (existing.schedule_type !== "custom") {
    return NextResponse.json(
      { error: "Predefined schedules cannot be deleted — use toggle instead" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await admin
    .from("tenant_scheduled_messages")
    .delete()
    .eq("id", scheduleId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
