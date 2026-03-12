import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embeddings";
import { computeRRFScore } from "./memory-scorer";
import { sanitizeLikePattern } from "@/lib/security/postgrest-sanitize";

interface KnowledgeChunkResult {
  id: string;
  content: string;
  knowledge_item_id: string;
  chunk_index: number;
  similarity: number;
  source_title?: string;
}

const SEMANTIC_OVER_FETCH = 15;
const KEYWORD_OVER_FETCH = 15;

/**
 * Hybrid knowledge search: semantic + keyword with RRF scoring.
 *
 * 1. Generate embedding (catch failure → keyword-only)
 * 2. Run semantic + keyword in parallel, over-fetch 15 each
 * 3. Merge by ID, keep max scores
 * 4. RRF scoring using computeRRFScore from memory-scorer
 * 5. Sort by RRF score, return top limit
 */
export async function searchKnowledge(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null,
  query: string,
  limit: number = 5
): Promise<KnowledgeChunkResult[]> {
  try {
    // Generate embedding (best-effort)
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(query);
    } catch {
      // Fall through to keyword-only
    }

    // Run semantic and keyword in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      embedding
        ? semanticSearch(admin, tenantId, agentId, embedding, SEMANTIC_OVER_FETCH)
        : Promise.resolve([]),
      keywordSearch(admin, tenantId, agentId, query, KEYWORD_OVER_FETCH),
    ]);

    // Merge by id
    const merged = new Map<string, {
      id: string;
      content: string;
      knowledge_item_id: string;
      chunk_index: number;
      source_title?: string;
      semanticRank: number | null;
      keywordRank: number | null;
    }>();

    semanticResults.forEach((row, idx) => {
      merged.set(row.id, {
        id: row.id,
        content: row.content,
        knowledge_item_id: row.knowledge_item_id,
        chunk_index: row.chunk_index,
        source_title: row.source_title,
        semanticRank: idx + 1,
        keywordRank: null,
      });
    });

    keywordResults.forEach((row, idx) => {
      const existing = merged.get(row.id);
      if (existing) {
        existing.keywordRank = idx + 1;
        if (!existing.source_title && row.source_title) {
          existing.source_title = row.source_title;
        }
      } else {
        merged.set(row.id, {
          id: row.id,
          content: row.content,
          knowledge_item_id: row.knowledge_item_id,
          chunk_index: row.chunk_index,
          source_title: row.source_title,
          semanticRank: null,
          keywordRank: idx + 1,
        });
      }
    });

    if (merged.size === 0) {
      return textFallbackSearch(admin, tenantId, agentId, query, limit);
    }

    // Score with RRF and sort
    const scored = Array.from(merged.values()).map((c) => ({
      ...c,
      rrfScore: computeRRFScore(c.semanticRank, c.keywordRank),
    }));

    scored.sort((a, b) => b.rrfScore - a.rrfScore);

    return scored.slice(0, limit).map((c) => ({
      id: c.id,
      content: c.content,
      knowledge_item_id: c.knowledge_item_id,
      chunk_index: c.chunk_index,
      similarity: c.rrfScore,
      source_title: c.source_title,
    }));
  } catch {
    return textFallbackSearch(admin, tenantId, agentId, query, limit);
  }
}

interface RawKnowledgeRow {
  id: string;
  content: string;
  knowledge_item_id: string;
  chunk_index: number;
  similarity?: number;
  rank?: number;
  source_title?: string;
}

async function semanticSearch(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null,
  embedding: number[],
  limit: number
): Promise<RawKnowledgeRow[]> {
  const { data, error } = await admin.rpc("match_tenant_knowledge_chunks", {
    p_tenant_id: tenantId,
    p_agent_id: agentId,
    p_embedding: JSON.stringify(embedding),
    p_match_count: limit,
    p_match_threshold: 0.3,
  });

  if (error) return [];
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    content: String(row.content),
    knowledge_item_id: String(row.knowledge_item_id),
    chunk_index: Number(row.chunk_index),
    similarity: Number(row.similarity ?? 0),
    source_title: row.source_title ? String(row.source_title) : undefined,
  }));
}

async function keywordSearch(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null,
  query: string,
  limit: number
): Promise<RawKnowledgeRow[]> {
  const { data, error } = await admin.rpc("keyword_match_tenant_knowledge_chunks", {
    p_tenant_id: tenantId,
    p_agent_id: agentId,
    p_query: query,
    p_match_count: limit,
  });

  if (error) return [];
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    content: String(row.content),
    knowledge_item_id: String(row.knowledge_item_id),
    chunk_index: Number(row.chunk_index),
    rank: Number(row.rank ?? 0),
    source_title: row.source_title ? String(row.source_title) : undefined,
  }));
}

async function textFallbackSearch(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null,
  query: string,
  limit: number
): Promise<KnowledgeChunkResult[]> {
  let q = admin
    .from("tenant_knowledge_chunks")
    .select("id, content, knowledge_item_id, chunk_index")
    .eq("tenant_id", tenantId)
    .ilike("content", `%${sanitizeLikePattern(query)}%`)
    .limit(limit);

  // Include shared knowledge (agent_id IS NULL) and agent-specific
  if (agentId) {
    q = q.or(`agent_id.is.null,agent_id.eq.${agentId}`);
  }

  const { data, error } = await q;
  if (error) return [];

  return (data || []).map((row) => ({
    id: row.id,
    content: row.content,
    knowledge_item_id: row.knowledge_item_id,
    chunk_index: row.chunk_index,
    similarity: 0.5,
  }));
}

export function formatKnowledgeForPrompt(chunks: KnowledgeChunkResult[]): string {
  if (chunks.length === 0) return "";

  const sections = chunks.map((c, i) => {
    const source = c.source_title ? ` (from: ${c.source_title})` : "";
    return `[${i + 1}]${source} ${c.content}`;
  });

  return `## Reference Information\n\nThe following information is from the team's uploaded documents:\n\n${sections.join("\n\n")}`;
}
