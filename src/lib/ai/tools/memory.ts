import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryType } from "../memory-tier-classifier";
import { writeMemoryRecord } from "../memory-record-writer";
import { hybridMemorySearch } from "../memory-retrieval";
import { searchConversations } from "../conversation-search";
import type { ScoredMemory } from "../memory-scorer";
import type { MemoryCaptureLevel } from "@/types/memory";

export type MemorySearchFn = (
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number,
  fastModel?: unknown,
  queryingAgentId?: string | null
) => Promise<ScoredMemory[]>;

interface MemoryToolsOptions {
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
  /** Override search implementation (for testing) */
  searchFn?: MemorySearchFn;
  /** The agent invoking these tools — used for write attribution and search affinity */
  agentId?: string | null;
}

export function createMemoryTools(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  options?: MemoryToolsOptions
) {
  const captureLevel = options?.captureLevel ?? "standard";
  const excludeCategories = options?.excludeCategories ?? [];
  const searchFn = options?.searchFn ?? hybridMemorySearch;
  const agentId = options?.agentId ?? null;

  return {
    memory_write: tool({
      description:
        "Save a fact, preference, or commitment to long-term memory. Use this when the user states something you should remember for future conversations.",
      inputSchema: z.object({
        content: z.string().describe("The fact or preference to remember"),
        memory_type: z
          .enum(["fact", "preference", "commitment", "outcome", "daily_log"])
          .describe("Type of memory: fact (data), preference (likes/dislikes), commitment (plans), outcome (result), daily_log (activity summary)"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Confidence level 0-1 (default 0.8)"),
      }),
      execute: async ({ content, memory_type, confidence: rawConfidence }) => {
        const confidence = rawConfidence ?? 0.8;
        const memoryType = memory_type as MemoryType;

        const result = await writeMemoryRecord({
          admin,
          tenantId,
          customerId,
          sessionId: null,
          content,
          memoryType,
          confidence,
          source: "runtime",
          captureLevel,
          excludeCategories,
          agentId,
        });

        if (!result.ok) {
          return { error: result.reason };
        }

        return { saved: true, memory: { id: result.id, content_text: content, memory_type: memoryType, memory_tier: result.tier }, tier: result.tier };
      },
    }),

    memory_search: tool({
      description:
        "Search long-term memory for previously saved facts, preferences, and commitments. Results are ranked by relevance (semantic similarity + recency + confidence).",
      inputSchema: z.object({
        query: z.string().describe("What to search for in memory"),
        limit: z.number().optional().describe("Max results (default 5)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const scored = await searchFn(admin, tenantId, query, limit ?? 5, undefined, agentId);
          return {
            memories: scored.map((m) => ({
              id: m.id,
              content: m.content,
              type: m.memory_type,
              tier: m.memory_tier,
              confidence: m.confidence,
              relevance: m.final_score,
              saved_at: m.created_at,
              agent_id: m.agent_id ?? null,
            })),
            count: scored.length,
          };
        } catch (err) {
          return { error: `Memory search failed: ${err instanceof Error ? err.message : "unknown error"}` };
        }
      },
    }),

    memory_read: tool({
      description:
        "Fetch a specific memory record by ID. Use this after memory_search to get the full details of a particular memory.",
      inputSchema: z.object({
        id: z.string().uuid().describe("The memory record ID to fetch"),
      }),
      execute: async ({ id }) => {
        try {
          const { data, error } = await admin
            .from("tenant_memory_records")
            .select("id, content_text, memory_type, memory_tier, confidence, source, created_at, content_json, agent_id")
            .eq("id", id)
            .eq("tenant_id", tenantId)
            .eq("is_tombstoned", false)
            .maybeSingle();

          if (error) {
            return { error: `Memory read failed: ${error.message}` };
          }

          if (!data) {
            return { error: "Memory not found" };
          }

          return {
            content: data.content_text,
            type: data.memory_type,
            tier: data.memory_tier,
            confidence: data.confidence,
            source: data.source,
            saved_at: data.created_at,
            metadata: data.content_json ?? {},
            agent_id: data.agent_id ?? null,
          };
        } catch (err) {
          return { error: `Memory read failed: ${err instanceof Error ? err.message : "unknown error"}` };
        }
      },
    }),

    conversation_search: tool({
      description:
        "Search past conversation messages for specific topics, decisions, or discussions. Use this when the user asks about previous conversations or when memory_search doesn't have the answer. Returns matching messages ranked by relevance.",
      inputSchema: z.object({
        query: z.string().describe("What to search for in conversation history"),
        limit: z.number().optional().describe("Max results (default 10, max 25)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const results = await searchConversations(admin, tenantId, query, limit ?? 10);
          return {
            messages: results.map((r) => ({
              id: r.id,
              session_id: r.session_id,
              direction: r.direction,
              content: r.content_text,
              sent_at: r.created_at,
              relevance: r.rank,
            })),
            count: results.length,
          };
        } catch (err) {
          return { error: `Conversation search failed: ${err instanceof Error ? err.message : "unknown error"}` };
        }
      },
    }),
  };
}
