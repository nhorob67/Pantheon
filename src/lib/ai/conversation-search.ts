import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationSearchResult {
  id: string;
  session_id: string;
  direction: string;
  content_text: string;
  created_at: string;
  rank: number;
}

/**
 * Full-text search over raw conversation messages for a tenant.
 * Uses PostgreSQL websearch_to_tsquery for ranked results.
 */
export async function searchConversations(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number = 10
): Promise<ConversationSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await admin.rpc("search_tenant_messages", {
    p_tenant_id: tenantId,
    p_query: trimmed,
    p_limit: Math.min(Math.max(limit, 1), 25),
  });

  if (error) {
    throw new Error(`Conversation search failed: ${error.message}`);
  }

  return (data ?? []).map((row: ConversationSearchResult) => ({
    id: row.id,
    session_id: row.session_id,
    direction: row.direction,
    content_text:
      row.content_text && row.content_text.length > 500
        ? row.content_text.slice(0, 497) + "..."
        : row.content_text ?? "",
    created_at: row.created_at,
    rank: row.rank,
  }));
}
