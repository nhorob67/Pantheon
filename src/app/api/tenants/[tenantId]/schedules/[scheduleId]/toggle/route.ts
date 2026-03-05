import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";
import { computeNextRun } from "@/lib/schedules/compute-next-run";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).enabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Body must include { enabled: boolean }" },
      { status: 400 }
    );
  }

  const enabled = (body as Record<string, unknown>).enabled as boolean;
  const admin = createAdminClient();

  // Verify the schedule belongs to this tenant
  const { data: schedule, error: fetchError } = await admin
    .from("tenant_scheduled_messages")
    .select("id, cron_expression, timezone, metadata")
    .eq("id", scheduleId)
    .eq("tenant_id", tenantContext.tenantId)
    .maybeSingle();

  if (fetchError || !schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  // Compute next_run_at when enabling using cron-parser
  let next_run_at: string | null = null;
  if (enabled) {
    const tz = schedule.timezone || "America/Chicago";
    try {
      next_run_at = computeNextRun(schedule.cron_expression, tz);
    } catch {
      // Fallback: set next run to now + 1 hour
      next_run_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
  }

  const { error: updateError } = await admin
    .from("tenant_scheduled_messages")
    .update({
      enabled,
      next_run_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .eq("tenant_id", tenantContext.tenantId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ updated: true, enabled, next_run_at });
}
