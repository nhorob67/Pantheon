import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailInbox } from "@/components/email/email-inbox";

export const metadata: Metadata = { title: "Email" };

export default async function EmailPage() {
  const admin = createAdminClient();
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Email
        </h2>
        <p className="text-foreground/60">
          No tenant workspace configured yet.
        </p>
      </div>
    );
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
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline text-2xl font-bold text-foreground">Email</h2>
          <p className="text-foreground/60 text-sm">
            Emails sent to your FarmClaw address will appear here.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-foreground/40 text-sm">
            No email conversations yet. Send an email to your FarmClaw address to get started.
          </p>
        </div>
      </div>
    );
  }

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
      fromEmail: email?.from_email || (s.metadata as Record<string, unknown>)?.from_email as string || "",
      status: email?.status || "unknown",
      messageCount: Number(stat?.message_count || 0),
      lastPreview: stat?.last_content?.slice(0, 120) || null,
      attachmentCount: email?.attachment_count || 0,
      lastMessageAt: s.last_message_at || s.updated_at,
      createdAt: s.created_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-foreground">Email</h2>
        <p className="text-foreground/60 text-sm">
          Review email conversations with your AI assistant.
        </p>
      </div>

      <EmailInbox conversations={conversations} />
    </div>
  );
}
