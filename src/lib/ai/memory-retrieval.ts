import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embeddings";
import { scoreMemories, type ScoredMemory } from "./memory-scorer";
import { expandQuery, flattenExpansion } from "./query-expander";
import { rerankCandidates } from "./reranker";
import { sanitizeLikePattern } from "@/lib/security/postgrest-sanitize";

interface RawMemoryRow {
  id: string;
  content_text: string;
  memory_type: string;
  memory_tier: string;
  confidence: number;
  created_at: string;
  similarity?: number;
  rank?: number;
}

const SEMANTIC_OVER_FETCH = 20;
const KEYWORD_OVER_FETCH = 20;

/**
 * Skip LLM query expansion for short, direct lookups.
 * Short queries without a question mark are likely direct keyword lookups
 * where expansion adds latency but no value.
 */
export function shouldSkipExpansion(query: string): boolean {
  const words = query.trim().split(/\s+/).length;
  return words < 5 && !query.includes("?");
}

/**
 * Skip LLM reranking when top results are already high-confidence.
 * If the top 3 results all score >= 0.8, reranking won't meaningfully reorder.
 */
export function shouldSkipRerank(scored: ScoredMemory[]): boolean {
  if (scored.length < 3) return false;
  return scored.slice(0, 3).every(s => s.final_score >= 0.8);
}

/**
 * Hybrid memory search: semantic + keyword, scored and ranked.
 *
 * 1. Expand query into sub-queries (LLM-powered with heuristic fallback)
 * 2. For each sub-query, run semantic + keyword search in parallel
 * 3. Merge, deduplicate, score with RRF, rerank, truncate
 */
export async function hybridMemorySearch(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number = 5,
  fastModel?: LanguageModel
): Promise<ScoredMemory[]> {
  // Gate 1: Skip expansion for short, direct lookups
  let tagged: { text: string; type: string }[];
  if (shouldSkipExpansion(query)) {
    tagged = [{ text: query, type: "original" }];
  } else {
    const expanded = await expandQuery(query, fastModel);
    tagged = flattenExpansion(expanded);
  }

  try {
    // Run all sub-queries in parallel
    const subResults = await Promise.all(
      tagged.map((sq) => runSingleHybridSearch(admin, tenantId, sq.text))
    );

    // Merge all candidates by id, keep highest scores
    const merged = new Map<string, {
      id: string;
      content: string;
      memory_type: string;
      memory_tier: string;
      confidence: number;
      created_at: string;
      semantic_score: number;
      keyword_score: number;
    }>();

    for (const candidates of subResults) {
      for (const c of candidates) {
        const existing = merged.get(c.id);
        if (existing) {
          existing.semantic_score = Math.max(existing.semantic_score, c.semantic_score);
          existing.keyword_score = Math.max(existing.keyword_score, c.keyword_score);
        } else {
          merged.set(c.id, { ...c });
        }
      }
    }

    // Score with RRF
    const scored = scoreMemories(Array.from(merged.values()));
    scored.sort((a, b) => b.final_score - a.final_score);

    // Gate 2: Skip reranking when top results are already high-confidence
    if (shouldSkipRerank(scored)) {
      return scored.slice(0, limit);
    }

    const reranked = await rerankCandidates(query, scored, fastModel);
    return reranked.slice(0, limit).map((r) => ({
      ...r,
      final_score: r.blended_score,
    }));
  } catch {
    // Fallback to ilike text search
    return textFallbackSearch(admin, tenantId, query, limit);
  }
}

async function runSingleHybridSearch(
  admin: SupabaseClient,
  tenantId: string,
  query: string
): Promise<Array<{
  id: string;
  content: string;
  memory_type: string;
  memory_tier: string;
  confidence: number;
  created_at: string;
  semantic_score: number;
  keyword_score: number;
}>> {
  // Generate embedding for semantic search
  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(query);
  } catch {
    // Proceed with keyword-only search
  }

  // Run semantic and keyword in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    embedding
      ? semanticSearch(admin, tenantId, embedding, SEMANTIC_OVER_FETCH)
      : Promise.resolve([]),
    keywordSearch(admin, tenantId, query, KEYWORD_OVER_FETCH),
  ]);

  // Merge by id
  const candidates = new Map<string, {
    id: string;
    content: string;
    memory_type: string;
    memory_tier: string;
    confidence: number;
    created_at: string;
    semantic_score: number;
    keyword_score: number;
  }>();

  for (const row of semanticResults) {
    candidates.set(row.id, {
      id: row.id,
      content: row.content_text,
      memory_type: row.memory_type,
      memory_tier: row.memory_tier,
      confidence: Number(row.confidence),
      created_at: row.created_at,
      semantic_score: row.similarity ?? 0,
      keyword_score: 0,
    });
  }

  for (const row of keywordResults) {
    const existing = candidates.get(row.id);
    if (existing) {
      existing.keyword_score = row.rank ?? 0;
    } else {
      candidates.set(row.id, {
        id: row.id,
        content: row.content_text,
        memory_type: row.memory_type,
        memory_tier: row.memory_tier,
        confidence: Number(row.confidence),
        created_at: row.created_at,
        semantic_score: 0,
        keyword_score: row.rank ?? 0,
      });
    }
  }

  return Array.from(candidates.values());
}

async function semanticSearch(
  admin: SupabaseClient,
  tenantId: string,
  embedding: number[],
  limit: number
): Promise<RawMemoryRow[]> {
  const { data, error } = await admin.rpc("match_tenant_memories", {
    p_tenant_id: tenantId,
    p_embedding: JSON.stringify(embedding),
    p_match_count: limit,
    p_match_threshold: 0.3,
  });

  if (error) return [];
  return (data || []) as RawMemoryRow[];
}

async function keywordSearch(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number
): Promise<RawMemoryRow[]> {
  const { data, error } = await admin.rpc("keyword_match_tenant_memories", {
    p_tenant_id: tenantId,
    p_query: query,
    p_match_count: limit,
  });

  if (error) return [];
  return (data || []) as RawMemoryRow[];
}

async function textFallbackSearch(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number
): Promise<ScoredMemory[]> {
  const { data, error } = await admin
    .from("tenant_memory_records")
    .select("id, content_text, memory_type, memory_tier, confidence, created_at")
    .eq("tenant_id", tenantId)
    .eq("is_tombstoned", false)
    .ilike("content_text", `%${sanitizeLikePattern(query)}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data || []).map((m) => ({
    id: m.id,
    content: m.content_text,
    memory_type: m.memory_type,
    memory_tier: m.memory_tier ?? "episodic",
    confidence: m.confidence,
    created_at: m.created_at,
    semantic_score: 0,
    keyword_score: 0,
    final_score: 0.5, // fallback score
  }));
}

/** @deprecated Use hybridMemorySearch instead */
export async function searchMemoryWithEmbeddings(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number = 5
): Promise<ScoredMemory[]> {
  return hybridMemorySearch(admin, tenantId, query, limit);
}

/** @deprecated Use packMemoryContext from context-packer.ts instead */
export function formatMemoriesForPrompt(memories: ScoredMemory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) =>
    `- [${m.memory_type}] ${m.content} (confidence: ${m.confidence})`
  );
  return `## What you remember about this farm\n\n${lines.join("\n")}`;
}
