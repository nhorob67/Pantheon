export interface ScoredMemory {
  id: string;
  content: string;
  memory_type: string;
  memory_tier: string;
  confidence: number;
  created_at: string;
  semantic_score: number;
  keyword_score: number;
  final_score: number;
}

interface RawCandidate {
  id: string;
  content: string;
  memory_type: string;
  memory_tier: string;
  confidence: number;
  created_at: string;
  semantic_score?: number;
  keyword_score?: number;
}

const RRF_K = 60;
const WEIGHT_RRF = 0.70;
const WEIGHT_RECENCY = 0.15;
const WEIGHT_TRUST = 0.10;
const DEFAULT_HALF_LIFE_DAYS = 30;
const RECENCY_FLOOR = 0.05;

/**
 * Type-aware freshness decay half-life (in days).
 * Knowledge/facts barely decay; working/outcomes decay quickly.
 */
const HALF_LIFE_TABLE: Record<string, Record<string, number>> = {
  knowledge: { fact: 90,  preference: 180, commitment: 180, outcome: 60, summary: 60, other: 60 },
  episodic:  { fact: 60,  preference: 90,  commitment: 60,  outcome: 30, summary: 30, other: 30 },
  working:   { fact: 14,  preference: 14,  commitment: 14,  outcome: 7,  summary: 7,  other: 7  },
};

export function getHalfLifeDays(tier?: string, type?: string): number {
  if (!tier || !type) return DEFAULT_HALF_LIFE_DAYS;
  return HALF_LIFE_TABLE[tier]?.[type] ?? DEFAULT_HALF_LIFE_DAYS;
}

const TIER_WEIGHTS: Record<string, number> = {
  knowledge: 1.0,
  episodic: 0.7,
  working: 0.4,
};

const TIER_BONUS: Record<string, number> = {
  knowledge: 0.05,
  episodic: 0.02,
  working: 0.00,
};

/**
 * Compute RRF score from semantic and keyword rank positions.
 * RRF(d) = Σ 1/(k + rank) for each source where the candidate appears.
 * Ranks are 1-indexed; null rank means the candidate didn't appear in that source.
 */
export function computeRRFScore(
  semanticRank: number | null,
  keywordRank: number | null,
  k: number = RRF_K
): number {
  let score = 0;
  if (semanticRank !== null) score += 1 / (k + semanticRank);
  if (keywordRank !== null) score += 1 / (k + keywordRank);
  return score;
}

/**
 * Compute recency score with exponential decay.
 * Half-life is type-aware when tier/type provided, defaults to 30 days.
 */
export function computeRecencyScore(
  createdAt: string,
  now?: Date,
  memoryTier?: string,
  memoryType?: string
): number {
  const created = new Date(createdAt).getTime();
  const current = (now ?? new Date()).getTime();
  const ageDays = Math.max(0, (current - created) / (1000 * 60 * 60 * 24));
  const halfLife = getHalfLifeDays(memoryTier, memoryType);
  const decay = Math.exp(-ageDays * Math.LN2 / halfLife);
  return Math.max(RECENCY_FLOOR, decay);
}

/**
 * Compute trust score from confidence and tier weight.
 */
export function computeTrustScore(confidence: number, tier: string): number {
  const tierWeight = TIER_WEIGHTS[tier] ?? 0.4;
  return confidence * tierWeight;
}

/**
 * Score and rank memory candidates using Reciprocal Rank Fusion.
 *
 * 1. Rank candidates separately by semantic_score and keyword_score (desc, 1-indexed)
 * 2. Compute RRF score for each candidate across both ranked lists
 * 3. Normalize RRF scores to [0, 1]
 * 4. final_score = 0.70 * normalized_rrf + 0.15 * recency + 0.10 * trust + tier_bonus
 */
export function scoreMemories(
  candidates: RawCandidate[],
  options?: { now?: Date }
): ScoredMemory[] {
  if (candidates.length === 0) return [];

  const now = options?.now;

  // Normalize keyword scores within batch (for display field only)
  const maxKeyword = Math.max(...candidates.map((c) => c.keyword_score ?? 0), 0.001);

  // Build rank lists (1-indexed, desc order)
  const semanticRanked = [...candidates]
    .filter((c) => (c.semantic_score ?? 0) > 0)
    .sort((a, b) => (b.semantic_score ?? 0) - (a.semantic_score ?? 0));
  const semanticRankMap = new Map<string, number>();
  semanticRanked.forEach((c, i) => semanticRankMap.set(c.id, i + 1));

  const keywordRanked = [...candidates]
    .filter((c) => (c.keyword_score ?? 0) > 0)
    .sort((a, b) => (b.keyword_score ?? 0) - (a.keyword_score ?? 0));
  const keywordRankMap = new Map<string, number>();
  keywordRanked.forEach((c, i) => keywordRankMap.set(c.id, i + 1));

  // Compute raw RRF scores
  const rrfScores = new Map<string, number>();
  let maxRRF = 0;
  for (const c of candidates) {
    const semRank = semanticRankMap.get(c.id) ?? null;
    const kwRank = keywordRankMap.get(c.id) ?? null;
    const rrf = computeRRFScore(semRank, kwRank);
    rrfScores.set(c.id, rrf);
    if (rrf > maxRRF) maxRRF = rrf;
  }

  // Normalize RRF
  const normalizer = maxRRF > 0 ? maxRRF : 1;

  return candidates.map((c) => {
    const normalizedRRF = (rrfScores.get(c.id) ?? 0) / normalizer;
    const recency = computeRecencyScore(c.created_at, now, c.memory_tier, c.memory_type);
    const trust = computeTrustScore(c.confidence, c.memory_tier);
    const tierBonus = TIER_BONUS[c.memory_tier] ?? 0;

    const score =
      WEIGHT_RRF * normalizedRRF +
      WEIGHT_RECENCY * recency +
      WEIGHT_TRUST * trust +
      tierBonus;

    return {
      id: c.id,
      content: c.content,
      memory_type: c.memory_type,
      memory_tier: c.memory_tier,
      confidence: c.confidence,
      created_at: c.created_at,
      semantic_score: c.semantic_score ?? 0,
      keyword_score: (c.keyword_score ?? 0) / maxKeyword,
      final_score: Math.min(1.0, Math.round(score * 1000) / 1000),
    };
  });
}
