import type { Metadata } from "next";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConversationList } from "@/components/dashboard/conversation-list";

export const metadata: Metadata = { title: "Conversations" };

interface SessionStat {
  session_id: string;
  message_count: number;
  last_content: string | null;
  last_direction: string | null;
}

export default async function ConversationsPage() {
  const { customerId } = await requireDashboardCustomer();
  const tenant = await getCustomerTenant(customerId);

  if (!tenant) {
    return (
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Conversations
        </h2>
        <p className="text-foreground/60">
          No tenant workspace configured yet.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("tenant_sessions")
    .select("id, session_kind, status, rolling_summary, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const sessionIds = (sessions || []).map((s) => s.id);
  const { data: stats } =
    sessionIds.length > 0
      ? await admin.rpc("get_session_stats", { p_session_ids: sessionIds })
      : { data: [] };

  const typedStats = (stats || []) as SessionStat[];
  const statsMap = new Map(typedStats.map((s) => [s.session_id, s]));
  const sessionsWithCounts = (sessions || []).map((s) => {
    const stat = statsMap.get(s.id);
    return {
      ...s,
      message_count: Number(stat?.message_count || 0),
      last_message_preview: stat?.last_content?.slice(0, 120) || null,
      last_message_direction: stat?.last_direction || null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-foreground">
          Conversations
        </h2>
        <p className="text-foreground/60 text-sm">
          Review past conversations and see how your AI assistant responded.
        </p>
      </div>

      <ConversationList sessions={sessionsWithCounts} tenantId={tenant.id} />
    </div>
  );
}
