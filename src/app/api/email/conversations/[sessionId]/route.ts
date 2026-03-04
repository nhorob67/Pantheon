import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
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

  // Verify session belongs to this customer
  const { data: session } = await admin
    .from("tenant_sessions")
    .select("id, tenant_id, title, status, session_kind, rolling_summary, metadata, created_at, updated_at")
    .eq("id", sessionId)
    .eq("customer_id", customer.id)
    .eq("session_kind", "email")
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Load messages
  const { data: messages } = await admin
    .from("tenant_messages")
    .select("id, direction, author_type, author_id, content_text, content_json, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);

  // Load inbound emails for this session
  const { data: inboundEmails } = await admin
    .from("email_inbound")
    .select("id, from_email, to_email, subject, status, attachment_count, in_reply_to, thread_id, ack_message_id, response_message_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // Load outbound emails
  const { data: outboundEmails } = await admin
    .from("email_outbound")
    .select("id, to_email, from_email, subject, body_text, outbound_type, status, sent_at, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // Load attachment info for inbound emails
  const inboundIds = (inboundEmails || []).map((e) => e.id);
  const { data: attachments } =
    inboundIds.length > 0
      ? await admin
          .from("email_inbound_attachments")
          .select("id, inbound_id, filename, mime_type, size_bytes")
          .in("inbound_id", inboundIds)
      : { data: [] };

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      metadata: session.metadata,
      createdAt: session.created_at,
    },
    messages: messages || [],
    inboundEmails: inboundEmails || [],
    outboundEmails: outboundEmails || [],
    attachments: attachments || [],
  });
}
