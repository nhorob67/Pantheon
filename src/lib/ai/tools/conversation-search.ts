import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeLikePattern } from "@/lib/security/postgrest-sanitize";

/**
 * Create a conversation_search tool that lets agents search raw message history.
 * This complements memory_search (long-term extracted facts) with direct
 * access to the actual conversation transcript.
 */
export function createConversationSearchTool(
  admin: SupabaseClient,
  tenantId: string,
  sessionId: string
) {
  return {
    conversation_search: tool({
      description:
        "Search the raw conversation history for specific messages. Use this to find exact quotes, recall what was said about a topic, or verify details from past conversations. Returns matching messages with timestamps and speaker role.",
      inputSchema: z.object({
        query: z.string().min(2).describe("Text to search for in conversation messages"),
        limit: z.number().min(1).max(50).optional().describe("Max results (default 10)"),
        direction: z
          .enum(["inbound", "outbound", "all"])
          .optional()
          .describe("Filter by message direction: inbound (user), outbound (assistant), or all (default)"),
      }),
      execute: async ({ query, limit, direction }) => {
        try {
          const maxResults = limit ?? 10;
          const sanitizedQuery = sanitizeLikePattern(query);

          let dbQuery = admin
            .from("tenant_messages")
            .select("id, direction, content_text, created_at")
            .eq("session_id", sessionId)
            .ilike("content_text", `%${sanitizedQuery}%`)
            .order("created_at", { ascending: false })
            .limit(maxResults);

          if (direction && direction !== "all") {
            dbQuery = dbQuery.eq("direction", direction);
          }

          const { data, error } = await dbQuery;

          if (error) {
            return { error: `Search failed: ${error.message}` };
          }

          if (!data || data.length === 0) {
            return { messages: [], count: 0, query };
          }

          return {
            messages: data.map((m) => ({
              role: m.direction === "inbound" ? "user" : "assistant",
              content: truncateContent(m.content_text ?? "", 500),
              timestamp: m.created_at,
            })),
            count: data.length,
            query,
          };
        } catch (err) {
          return {
            error: `Conversation search failed: ${err instanceof Error ? err.message : "unknown error"}`,
          };
        }
      },
    }),
  };
}

function truncateContent(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
