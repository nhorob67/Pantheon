import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryType } from "../memory-tier-classifier";
import { writeMemoryRecord, updateMemoryRecord } from "../memory-record-writer";
import { hybridMemorySearch } from "../memory-retrieval";
import { searchConversations } from "../conversation-search";
import { loadSummaryDAG, formatTimeRange } from "../summary-dag";
import { estimateTokens } from "../history-loader";
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
  /** Current session ID — needed for conversation_history_explore tool */
  sessionId?: string | null;
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
  const sessionId = options?.sessionId ?? null;

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

    memory_update: tool({
      description:
        "Update an existing memory record with new content. Use this when the user wants to modify, append to, or replace information in an existing memory (e.g. adding items to a to-do list, updating a status, correcting a fact). Search for the memory first with memory_search, then pass its ID here.",
      inputSchema: z.object({
        id: z.string().uuid().describe("The ID of the existing memory to update (from memory_search or memory_read)"),
        content: z.string().describe("The full updated content to replace the old memory with"),
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
      execute: async ({ id, content, memory_type, confidence: rawConfidence }) => {
        const confidence = rawConfidence ?? 0.8;
        const memoryType = memory_type as import("../memory-tier-classifier").MemoryType;

        const result = await updateMemoryRecord({
          admin,
          tenantId,
          customerId,
          existingId: id,
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

        return {
          updated: true,
          memory: { id: result.id, content_text: content, memory_type: memoryType, memory_tier: result.tier },
          replaced_id: result.supersededId,
          tier: result.tier,
        };
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

    conversation_history_explore: tool({
      description:
        "Explore the hierarchical summary of past conversations. Use this when the user asks about what happened over a longer period (e.g. 'what did we discuss last week?') or when conversation_search doesn't find older context that may have been compacted into summaries.",
      inputSchema: z.object({
        question: z.string().describe("Natural-language question about past conversations"),
        time_start: z.string().optional().describe("ISO date to filter from (e.g. '2026-03-10')"),
        time_end: z.string().optional().describe("ISO date to filter until (e.g. '2026-03-18')"),
      }),
      execute: async ({ question, time_start, time_end }) => {
        if (!sessionId) {
          return { error: "No active session for history exploration" };
        }
        try {
          const nodes = await loadSummaryDAG(admin, sessionId);
          if (nodes.length === 0) {
            return { summaries: [], message: "No conversation summaries available yet" };
          }

          const TOKEN_BUDGET = 2000;
          const questionLower = question.toLowerCase();
          const queryTerms = questionLower.match(/\b[a-z]{3,}\b/g) ?? [];

          // Filter nodes by time range if specified
          let candidates = nodes;
          if (time_start || time_end) {
            candidates = nodes.filter((n) => {
              if (!n.message_time_start && !n.message_time_end) return true; // include nodes without timestamps
              const nodeStart = n.message_time_start ?? n.message_time_end!;
              const nodeEnd = n.message_time_end ?? n.message_time_start!;
              if (time_end && nodeStart > time_end) return false;
              if (time_start && nodeEnd < time_start) return false;
              return true;
            });
          }

          // Score nodes by keyword overlap with the question
          const scored = candidates.map((n) => {
            const textLower = n.summary_text.toLowerCase();
            let score = 0;
            for (const term of queryTerms) {
              if (textLower.includes(term)) score++;
            }
            // Boost higher-depth nodes slightly (broader context)
            score += n.depth * 0.3;
            return { node: n, score };
          });

          // Sort by relevance, then by depth desc (broader first)
          scored.sort((a, b) => b.score - a.score || b.node.depth - a.node.depth);

          // Collect results within token budget
          const results: Array<{
            depth: number;
            time_range: string;
            summary: string;
          }> = [];
          let tokensUsed = 0;

          for (const { node, score } of scored) {
            if (score <= 0 && results.length > 0) break; // stop after relevant nodes exhausted
            const tokens = node.token_count || estimateTokens(node.summary_text);
            if (tokensUsed + tokens > TOKEN_BUDGET) continue;

            results.push({
              depth: node.depth,
              time_range: formatTimeRange(node.message_time_start, node.message_time_end).trim(),
              summary: node.summary_text,
            });
            tokensUsed += tokens;
          }

          // If no keyword matches, return the root + most recent leaves
          if (results.length === 0) {
            let fallbackTokens = 0;
            const rootNodes = candidates.filter((n) => n.depth === Math.max(...candidates.map((c) => c.depth)));
            for (const root of rootNodes.slice(0, 1)) {
              const tokens = root.token_count || estimateTokens(root.summary_text);
              if (fallbackTokens + tokens <= TOKEN_BUDGET) {
                results.push({
                  depth: root.depth,
                  time_range: formatTimeRange(root.message_time_start, root.message_time_end).trim(),
                  summary: root.summary_text,
                });
                fallbackTokens += tokens;
              }
            }
            const leaves = candidates.filter((n) => n.depth === 0).slice(0, 3);
            for (const leaf of leaves) {
              const tokens = leaf.token_count || estimateTokens(leaf.summary_text);
              if (fallbackTokens + tokens <= TOKEN_BUDGET) {
                results.push({
                  depth: leaf.depth,
                  time_range: formatTimeRange(leaf.message_time_start, leaf.message_time_end).trim(),
                  summary: leaf.summary_text,
                });
                fallbackTokens += tokens;
              }
            }
          }

          return { summaries: results, count: results.length };
        } catch (err) {
          return { error: `History exploration failed: ${err instanceof Error ? err.message : "unknown error"}` };
        }
      },
    }),
  };
}
