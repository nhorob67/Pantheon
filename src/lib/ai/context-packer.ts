import type { ScoredMemory } from "./memory-scorer.ts";
import { formatDistanceToNow } from "date-fns";

const DEFAULT_TOKEN_BUDGET = 1500;
const SCORE_THRESHOLD = 0.25;
const MMR_LAMBDA = 0.3;

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function formatAge(createdAt: string): string {
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  } catch {
    return "unknown age";
  }
}

function sanitizeMemoryContent(content: string): string {
  const s = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s.length > 500 ? s.slice(0, 500) + "..." : s;
}

export interface PackedContext {
  formatted: string;
  includedMemoryIds: string[];
  tokenCount: number;
  candidateCount: number;
  includedCount: number;
}

// --- Bigram similarity helpers ---

export function extractBigrams(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Filter contradicting same-type memories. When two memories of the same type
 * have Jaccard bigram similarity >= 0.5, keep only the newest.
 */
export function filterContradictions(
  memories: ScoredMemory[],
  bigramCache: Map<string, Set<string>>
): ScoredMemory[] {
  const dominated = new Set<string>();

  for (let i = 0; i < memories.length; i++) {
    if (dominated.has(memories[i].id)) continue;
    const aBigrams = bigramCache.get(memories[i].id)!;

    for (let j = i + 1; j < memories.length; j++) {
      if (dominated.has(memories[j].id)) continue;
      if (memories[i].memory_type !== memories[j].memory_type) continue;

      const bBigrams = bigramCache.get(memories[j].id)!;
      if (jaccardSimilarity(aBigrams, bBigrams) >= 0.5) {
        // Keep newer, remove older
        const iTime = new Date(memories[i].created_at).getTime();
        const jTime = new Date(memories[j].created_at).getTime();
        dominated.add(iTime >= jTime ? memories[j].id : memories[i].id);
      }
    }
  }

  return memories.filter((m) => !dominated.has(m.id));
}

/**
 * Pack scored memories into a token-budgeted context section.
 *
 * 1. Filter: discard memories with final_score < 0.25
 * 2. Contradiction filter: same-type near-duplicates → keep newer
 * 3. MMR diversity: penalize redundancy during selection
 * 4. Format each as data (not instructions) to prevent prompt injection
 */
export function packMemoryContext(
  memories: ScoredMemory[],
  options?: { tokenBudget?: number; scoreThreshold?: number }
): PackedContext {
  const budget = options?.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const threshold = options?.scoreThreshold ?? SCORE_THRESHOLD;

  if (memories.length === 0) {
    return { formatted: "", includedMemoryIds: [], tokenCount: 0, candidateCount: 0, includedCount: 0 };
  }

  // Filter below threshold
  let eligible = memories
    .filter((m) => m.final_score >= threshold)
    .sort((a, b) => b.final_score - a.final_score);

  if (eligible.length === 0) {
    return { formatted: "", includedMemoryIds: [], tokenCount: 0, candidateCount: memories.length, includedCount: 0 };
  }

  // Pre-compute bigrams
  const bigramCache = new Map<string, Set<string>>();
  for (const m of eligible) {
    bigramCache.set(m.id, extractBigrams(m.content));
  }

  // Contradiction filter
  eligible = filterContradictions(eligible, bigramCache);

  // Header
  const header = "## What you remember about this farm\n\n";
  const headerTokens = estimateTokens(header);
  let remainingBudget = budget - headerTokens;

  // MMR selection
  const selected: ScoredMemory[] = [];
  const selectedBigrams: Set<string>[] = [];
  const used = new Set<string>();

  while (eligible.length > 0 && (remainingBudget > 0 || selected.length === 0)) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < eligible.length; i++) {
      if (used.has(eligible[i].id)) continue;

      const relevance = eligible[i].final_score;
      let maxSim = 0;
      const candidateBigrams = bigramCache.get(eligible[i].id)!;

      for (const selBigrams of selectedBigrams) {
        const sim = jaccardSimilarity(candidateBigrams, selBigrams);
        if (sim > maxSim) maxSim = sim;
      }

      const mmrScore = (1 - MMR_LAMBDA) * relevance - MMR_LAMBDA * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const m = eligible[bestIdx];
    const confidencePct = Math.round(m.confidence * 100);
    const age = formatAge(m.created_at);
    const sanitized = sanitizeMemoryContent(m.content);
    const line = `- [${m.memory_type}] ${sanitized} (${confidencePct}% confidence, ${age}, ${m.memory_tier})`;
    const lineTokens = estimateTokens(line + "\n");

    if (remainingBudget - lineTokens < 0 && selected.length > 0) break;

    selected.push(m);
    selectedBigrams.push(bigramCache.get(m.id)!);
    used.add(m.id);
    remainingBudget -= lineTokens;
  }

  if (selected.length === 0) {
    return { formatted: "", includedMemoryIds: [], tokenCount: 0, candidateCount: memories.length, includedCount: 0 };
  }

  const lines = selected.map((m) => {
    const confidencePct = Math.round(m.confidence * 100);
    const age = formatAge(m.created_at);
    const sanitized = sanitizeMemoryContent(m.content);
    return `- [${m.memory_type}] ${sanitized} (${confidencePct}% confidence, ${age}, ${m.memory_tier})`;
  });

  const formatted = `${header}${lines.join("\n")}`;
  const tokenCount = estimateTokens(formatted);

  return {
    formatted,
    includedMemoryIds: selected.map((m) => m.id),
    tokenCount,
    candidateCount: memories.length,
    includedCount: selected.length,
  };
}
