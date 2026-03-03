import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
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

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const admin = createAdminClient();
  const { data: sessions, error } = await admin
    .from("tenant_sessions")
    .select("id, session_kind, status, rolling_summary, created_at, updated_at")
    .eq("tenant_id", tenantContext.tenantId)
    .eq("customer_id", tenantContext.customerId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessionsWithCounts = await Promise.all(
    (sessions || []).map(async (s) => {
      const { count } = await admin
        .from("tenant_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id);

      return {
        ...s,
        message_count: count || 0,
      };
    })
  );

  return NextResponse.json({ sessions: sessionsWithCounts });
}
