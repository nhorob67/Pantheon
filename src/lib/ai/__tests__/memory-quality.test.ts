import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreMemories, type ScoredMemory } from "../memory-scorer.ts";
import { packMemoryContext } from "../context-packer.ts";
import { getActiveMemories, getMemoriesByTag } from "./fixtures/farm-memories.ts";

const NOW = new Date("2026-02-24T12:00:00Z");

/**
 * Simulate a hybrid search: given a query and fixture memories, score them
 * as if they came from a real search. We simulate semantic_score using
 * tag-based matching and keyword_score using substring matching.
 */
function simulateSearch(
  query: string,
  matchTags: string[],
  limit: number = 10
): ScoredMemory[] {
  const active = getActiveMemories();

  const candidates = active.map((m) => {
    const tagMatch = matchTags.some((t) => m.tags.includes(t));
    const tagMatchCount = matchTags.filter((t) => m.tags.includes(t)).length;
    const textMatch = m.content.toLowerCase().includes(query.toLowerCase());

    // Deterministic scoring: more tag matches = higher semantic score
    const semanticBase = tagMatch ? 0.7 + tagMatchCount * 0.05 : textMatch ? 0.4 : 0;
    const keywordBase = textMatch ? 0.6 : 0;

    return {
      id: m.id,
      content: m.content,
      memory_type: m.memory_type,
      memory_tier: m.memory_tier,
      confidence: m.confidence,
      created_at: m.created_at,
      semantic_score: semanticBase,
      keyword_score: keywordBase,
    };
  }).filter((c) => c.semantic_score > 0 || c.keyword_score > 0);

  const scored = scoreMemories(candidates, { now: NOW });
  scored.sort((a, b) => b.final_score - a.final_score);
  return scored.slice(0, limit);
}

describe("Memory Quality: Direct Fact Lookup", () => {
  it("'Where deliver corn?' returns corn delivery memory in top 3", () => {
    const results = simulateSearch("deliver corn", ["corn", "delivery"]);
    const top3Ids = results.slice(0, 3).map((r) => r.id);
    // mem-002: "Always delivers corn to CHS Minot elevator"
    assert.ok(
      top3Ids.includes("mem-002"),
      `Expected mem-002 in top 3, got: ${top3Ids.join(", ")}`
    );
  });
});

describe("Memory Quality: Indirect Reference", () => {
  it("'What crops?' returns acreage memories in top results", () => {
    const results = simulateSearch("crops", ["acreage", "corn", "soybeans", "wheat"]);
    const top5Ids = results.slice(0, 5).map((r) => r.id);
    // Should include at least one acreage memory
    const acreageMemories = getMemoriesByTag("acreage");
    const found = acreageMemories.some((m) => top5Ids.includes(m.id));
    assert.ok(found, `Expected acreage memory in top 5, got: ${top5Ids.join(", ")}`);
  });
});

describe("Memory Quality: Superseded Memory Excluded", () => {
  it("tombstoned records are not in active set", () => {
    const active = getActiveMemories();
    const tombstoned = active.find((m) => m.id === "mem-013");
    assert.equal(tombstoned, undefined, "Tombstoned mem-013 should not be in active memories");
  });

  it("current basis is returned, not superseded", () => {
    const results = simulateSearch("corn basis", ["corn", "basis"]);
    const ids = results.map((r) => r.id);
    assert.ok(!ids.includes("mem-013"), "Superseded mem-013 should not appear");
    assert.ok(ids.includes("mem-014"), "Current mem-014 should appear");
  });
});

describe("Memory Quality: Recency Weighting", () => {
  it("newer basis memory scores above older one", () => {
    // mem-014: 5 days old, mem-021: 200 days old
    const candidates = [
      {
        id: "mem-014",
        content: "Corn basis at CHS Minot is -18 cents as of Feb 2026",
        memory_type: "fact",
        memory_tier: "episodic",
        confidence: 0.85,
        created_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
        semantic_score: 0.8,
        keyword_score: 0.6,
      },
      {
        id: "mem-021",
        content: "Corn basis at CHS Minot was -30 cents in August 2025",
        memory_type: "fact",
        memory_tier: "episodic",
        confidence: 0.9,
        created_at: new Date(NOW.getTime() - 200 * 86_400_000).toISOString(),
        semantic_score: 0.8,
        keyword_score: 0.6,
      },
    ];

    const scored = scoreMemories(candidates, { now: NOW });
    scored.sort((a, b) => b.final_score - a.final_score);
    assert.equal(scored[0].id, "mem-014", "Newer memory should rank first");
  });
});

describe("Memory Quality: Tier Separation", () => {
  it("knowledge items rank above working items with same semantic score", () => {
    const candidates = [
      {
        id: "knowledge",
        content: "Farm has 2400 acres of corn near Minot, ND",
        memory_type: "fact",
        memory_tier: "knowledge",
        confidence: 0.9,
        created_at: NOW.toISOString(),
        semantic_score: 0.7,
        keyword_score: 0,
      },
      {
        id: "working",
        content: "Asked about weather this morning",
        memory_type: "outcome",
        memory_tier: "working",
        confidence: 0.6,
        created_at: NOW.toISOString(),
        semantic_score: 0.7,
        keyword_score: 0,
      },
    ];

    const scored = scoreMemories(candidates, { now: NOW });
    scored.sort((a, b) => b.final_score - a.final_score);
    assert.equal(scored[0].id, "knowledge", "Knowledge should rank above working");
  });
});

describe("Memory Quality: Budget Compliance", () => {
  it("20 candidates with 200-token budget includes only a few items", () => {
    const candidates = getActiveMemories().slice(0, 20).map((m, i) => ({
      ...m,
      content: m.content,
      semantic_score: 0.8 - i * 0.02,
      keyword_score: 0.3,
      final_score: 0.7 - i * 0.01,
    }));

    const packed = packMemoryContext(candidates as ScoredMemory[], { tokenBudget: 200 });
    assert.ok(
      packed.includedCount >= 2 && packed.includedCount <= 8,
      `Expected 2-8 included, got ${packed.includedCount}`
    );
    assert.ok(packed.tokenCount <= 200, `Expected <= 200 tokens, got ${packed.tokenCount}`);
    assert.ok(packed.includedCount < 20, "Should not include all 20");
  });
});

describe("Memory Quality: No-Match Query", () => {
  it("below-threshold query returns empty after packing", () => {
    const candidates = getActiveMemories().map((m) => ({
      ...m,
      semantic_score: 0.1,
      keyword_score: 0,
      final_score: 0.15,
    }));

    const packed = packMemoryContext(candidates as ScoredMemory[]);
    assert.equal(packed.includedCount, 0);
    assert.equal(packed.formatted, "");
  });
});
