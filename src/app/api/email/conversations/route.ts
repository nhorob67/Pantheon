import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "No customer found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ conversations: [] });
  }

  // Get email sessions
  const { data: sessions } = await admin
    .from("tenant_sessions")
    .select("id, title, status, metadata, created_at, updated_at, last_message_at")
    .eq("tenant_id", tenant.id)
    .eq("session_kind", "email")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // Get message counts and latest inbound email metadata
  const sessionIds = sessions.map((s) => s.id);

  const [{ data: stats }, { data: inboundEmails }] = await Promise.all([
    admin.rpc("get_session_stats", { p_session_ids: sessionIds }),
    admin
      .from("email_inbound")
      .select("session_id, from_email, subject, status, attachment_count, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false }),
  ]);

  const statsMap = new Map(
    ((stats || []) as Array<{ session_id: string; message_count: number; last_content: string | null }>)
      .map((s) => [s.session_id, s])
  );

  // Group inbound emails by session, take the latest
  const latestInbound = new Map<string, {
    from_email: string;
    subject: string;
    status: string;
    attachment_count: number;
    created_at: string;
  }>();

  for (const email of (inboundEmails || []) as Array<{
    session_id: string;
    from_email: string;
    subject: string;
    status: string;
    attachment_count: number;
    created_at: string;
  }>) {
    if (!latestInbound.has(email.session_id)) {
      latestInbound.set(email.session_id, email);
    }
  }

  const conversations = sessions.map((s) => {
    const stat = statsMap.get(s.id);
    const email = latestInbound.get(s.id);
    return {
      sessionId: s.id,
      title: s.title || email?.subject || "(no subject)",
      fromEmail: email?.from_email || (s.metadata as Record<string, unknown>)?.from_email || "",
      status: email?.status || "unknown",
      messageCount: Number(stat?.message_count || 0),
      lastPreview: stat?.last_content?.slice(0, 120) || null,
      attachmentCount: email?.attachment_count || 0,
      lastMessageAt: s.last_message_at || s.updated_at,
      createdAt: s.created_at,
    };
  });

  return NextResponse.json({ conversations });
}
