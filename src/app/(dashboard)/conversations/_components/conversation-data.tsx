import { createAdminClient } from "@/lib/supabase/admin";
import { ConversationList } from "@/components/dashboard/conversation-list";

interface SessionStat {
  session_id: string;
  message_count: number;
  last_content: string | null;
  last_direction: string | null;
}

export async function ConversationData({ tenantId }: { tenantId: string }) {
  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("tenant_sessions")
    .select("id, session_kind, status, rolling_summary, created_at, updated_at")
    .eq("tenant_id", tenantId)
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

  return <ConversationList sessions={sessionsWithCounts} tenantId={tenantId} />;
}
