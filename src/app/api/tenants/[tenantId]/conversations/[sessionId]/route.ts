import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthorizedTenantContext } from "@/lib/runtime/tenant-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; sessionId: string }> }
) {
  const { tenantId, sessionId } = await params;
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

  const { data: messages, error: messagesErr } = await admin
    .from("tenant_messages")
    .select("id, direction, author_type, content, token_count, created_at")
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantContext.tenantId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (messagesErr) {
    return NextResponse.json({ error: messagesErr.message }, { status: 500 });
  }

  const { data: traces } = await admin
    .from("tenant_conversation_traces")
    .select("*")
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantContext.tenantId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    messages: messages || [],
    traces: traces || [],
  });
}
