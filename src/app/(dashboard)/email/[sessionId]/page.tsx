import type { Metadata } from "next";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailThreadDetail } from "@/components/email/email-thread-detail";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Email Thread" };

export default async function EmailThreadPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { customerId } = await requireDashboardCustomer();
  const admin = createAdminClient();

  // Verify session belongs to this customer
  const { data: session } = await admin
    .from("tenant_sessions")
    .select("id, tenant_id, title, status, session_kind, metadata, created_at, updated_at")
    .eq("id", sessionId)
    .eq("customer_id", customerId)
    .eq("session_kind", "email")
    .maybeSingle();

  if (!session) {
    redirect("/email");
  }

  // Load messages, inbound emails, and outbound emails in parallel
  const [{ data: messages }, { data: inboundEmails }, { data: outboundEmails }] =
    await Promise.all([
      admin
        .from("tenant_messages")
        .select("id, direction, author_type, author_id, content_text, content_json, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200),
      admin
        .from("email_inbound")
        .select("id, from_email, to_email, subject, status, attachment_count, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
      admin
        .from("email_outbound")
        .select("id, to_email, from_email, subject, body_text, outbound_type, status, sent_at, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

  // Load attachment info
  const inboundIds = (inboundEmails || []).map((e) => e.id);
  const { data: attachments } =
    inboundIds.length > 0
      ? await admin
          .from("email_inbound_attachments")
          .select("id, inbound_id, filename, mime_type, size_bytes")
          .in("inbound_id", inboundIds)
      : { data: [] };

  return (
    <div className="space-y-6">
      <EmailThreadDetail
        session={{
          id: session.id,
          title: session.title || "(no subject)",
          status: session.status,
          metadata: session.metadata as Record<string, unknown>,
          createdAt: session.created_at,
        }}
        messages={(messages || []).map((m) => ({
          id: m.id,
          direction: m.direction,
          authorType: m.author_type,
          authorId: m.author_id,
          content: m.content_text,
          contentJson: m.content_json as Record<string, unknown>,
          createdAt: m.created_at,
        }))}
        inboundEmails={(inboundEmails || []).map((e) => ({
          id: e.id,
          fromEmail: e.from_email,
          toEmail: e.to_email,
          subject: e.subject,
          status: e.status,
          attachmentCount: e.attachment_count,
          createdAt: e.created_at,
        }))}
        outboundEmails={(outboundEmails || []).map((e) => ({
          id: e.id,
          toEmail: e.to_email,
          fromEmail: e.from_email,
          subject: e.subject,
          bodyText: e.body_text,
          outboundType: e.outbound_type,
          status: e.status,
          sentAt: e.sent_at,
          createdAt: e.created_at,
        }))}
        attachments={(attachments || []).map((a) => ({
          id: a.id,
          inboundId: a.inbound_id,
          filename: a.filename,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
        }))}
      />
    </div>
  );
}
