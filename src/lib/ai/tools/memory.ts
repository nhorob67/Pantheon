import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryType } from "../memory-tier-classifier";
import { writeMemoryRecord } from "../memory-record-writer";
import { hybridMemorySearch } from "../memory-retrieval";
import type { ScoredMemory } from "../memory-scorer";
import type { MemoryCaptureLevel } from "@/types/memory";

export type MemorySearchFn = (
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number
) => Promise<ScoredMemory[]>;

interface MemoryToolsOptions {
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
  /** Override search implementation (for testing) */
  searchFn?: MemorySearchFn;
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

  return {
    memory_write: tool({
      description:
        "Save a fact, preference, or commitment to long-term memory. Use this when the farmer states something you should remember for future conversations.",
      inputSchema: z.object({
        content: z.string().describe("The fact or preference to remember"),
        memory_type: z
          .enum(["fact", "preference", "commitment", "outcome"])
          .describe("Type of memory: fact (data), preference (likes/dislikes), commitment (plans), outcome (result)"),
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
        });

        if (!result.ok) {
          return { error: result.reason };
        }

        return { saved: true, memory: { id: result.id, content_text: content, memory_type: memoryType, memory_tier: result.tier }, tier: result.tier };
      },
    }),

    memory_search: tool({
      description:
        "Search long-term memory for previously saved facts, preferences, and commitments about this farm. Results are ranked by relevance (semantic similarity + recency + confidence).",
      inputSchema: z.object({
        query: z.string().describe("What to search for in memory"),
        limit: z.number().optional().describe("Max results (default 5)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const scored = await searchFn(admin, tenantId, query, limit ?? 5);
          return {
            memories: scored.map((m) => ({
              content: m.content,
              type: m.memory_type,
              tier: m.memory_tier,
              confidence: m.confidence,
              relevance: m.final_score,
              saved_at: m.created_at,
            })),
            count: scored.length,
          };
        } catch (err) {
          return { error: `Memory search failed: ${err instanceof Error ? err.message : "unknown error"}` };
        }
      },
    }),
  };
}
