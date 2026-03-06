import { generateText, type LanguageModel } from "ai";
import { farmclawFastModel } from "./client";
import type { ScoredMemory } from "./memory-scorer";

export interface RerankedMemory extends ScoredMemory {
  rerank_score: number;
  blended_score: number;
}

const RERANK_TOP_N = 10;

const SYSTEM_PROMPT = `You are a relevance scoring engine. Given a query and a list of memory passages, rate each passage's relevance to the query on a scale of 0.0 to 1.0.

Return ONLY a JSON array of numbers, one per passage, in the same order as presented. No explanation, no markdown fences.

Example: [0.9, 0.3, 0.7, 0.1]`;

/**
 * Get position-aware blend weights.
 * Positions 1-3: trust retrieval (75/25)
 * Positions 4-7: balanced (60/40)
 * Positions 8+: trust reranker (40/60)
 */
export function getBlendWeights(position: number): {
  retrieval: number;
  rerank: number;
} {
  if (position <= 3) return { retrieval: 0.75, rerank: 0.25 };
  if (position <= 7) return { retrieval: 0.60, rerank: 0.40 };
  return { retrieval: 0.40, rerank: 0.60 };
}

/**
 * Parse the reranker response into an array of scores.
 * Returns null on failure.
 */
export function parseRerankResponse(
  text: string,
  expectedCount: number
): number[] | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  if (parsed.length !== expectedCount) return null;

  const scores: number[] = [];
  for (const item of parsed) {
    const n = Number(item);
    if (isNaN(n)) return null;
    scores.push(Math.max(0, Math.min(1, n)));
  }

  return scores;
}

/**
 * Rerank candidates using Haiku as a cross-encoder.
 * Reranks the top N candidates, passes through the rest with discounted scores.
 * On any failure, returns input candidates with blended_score = final_score.
 */
export async function rerankCandidates(
  query: string,
  candidates: ScoredMemory[],
  model?: LanguageModel
): Promise<RerankedMemory[]> {
  if (candidates.length === 0) return [];

  // Identity fallback: blended_score = final_score
  const identityFallback = (): RerankedMemory[] =>
    candidates.map((c) => ({
      ...c,
      rerank_score: c.final_score,
      blended_score: c.final_score,
    }));

  // Only rerank top N
  const toRerank = candidates.slice(0, RERANK_TOP_N);
  const overflow = candidates.slice(RERANK_TOP_N);

  if (toRerank.length === 0) return identityFallback();

  try {
    const passages = toRerank
      .map((c, i) => `[${i + 1}] ${c.content.slice(0, 300)}`)
      .join("\n");

    const { text } = await generateText({
      model: model ?? farmclawFastModel,
      system: SYSTEM_PROMPT,
      prompt: `Query: "${query}"\n\nPassages:\n${passages}`,
      maxOutputTokens: 100,
      temperature: 0,
      abortSignal: AbortSignal.timeout(3000),
    });

    const scores = parseRerankResponse(text, toRerank.length);
    if (!scores) return identityFallback();

    // Blend scores with position-aware weights
    const reranked: RerankedMemory[] = toRerank.map((c, i) => {
      const position = i + 1;
      const weights = getBlendWeights(position);
      const blended =
        weights.retrieval * c.final_score + weights.rerank * scores[i];
      return {
        ...c,
        rerank_score: scores[i],
        blended_score: Math.round(blended * 1000) / 1000,
      };
    });

    // Overflow candidates get discounted passthrough
    const minBlended = reranked.length > 0
      ? Math.min(...reranked.map((r) => r.blended_score))
      : 0;
    const overflowReranked: RerankedMemory[] = overflow.map((c) => ({
      ...c,
      rerank_score: 0,
      blended_score: Math.round(Math.min(c.final_score, minBlended * 0.9) * 1000) / 1000,
    }));

    const all = [...reranked, ...overflowReranked];
    all.sort((a, b) => b.blended_score - a.blended_score);

    return all;
  } catch {
    return identityFallback();
  }
}
