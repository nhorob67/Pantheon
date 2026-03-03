import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";

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

  // Compute next_run_at when enabling
  let next_run_at: string | null = null;
  if (enabled) {
    const metadata = (schedule.metadata || {}) as Record<string, unknown>;
    const sendTime =
      typeof metadata.send_time === "string" ? metadata.send_time : null;
    const tz = schedule.timezone || "America/Chicago";

    if (sendTime) {
      // Use same logic as briefing for computing next run
      const [hours, minutes] = sendTime.split(":").map(Number);
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const get = (t: string) =>
        parts.find((p) => p.type === t)?.value ?? "0";
      const currentHour = parseInt(get("hour"), 10);
      const currentMinute = parseInt(get("minute"), 10);
      const isToday =
        currentHour < hours ||
        (currentHour === hours && currentMinute < minutes);

      const target = new Date(now);
      if (!isToday) target.setDate(target.getDate() + 1);

      const localNow = new Date(
        now.toLocaleString("en-US", { timeZone: tz })
      );
      const utcOffset = now.getTime() - localNow.getTime();
      const localTarget = new Date(target);
      localTarget.setHours(hours, minutes, 0, 0);
      next_run_at = new Date(localTarget.getTime() + utcOffset).toISOString();
    } else {
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
