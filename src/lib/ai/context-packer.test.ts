import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  packMemoryContext,
  extractBigrams,
  jaccardSimilarity,
  filterContradictions,
} from "./context-packer.ts";
import type { ScoredMemory } from "./memory-scorer.ts";

const NOW = new Date("2026-02-24T12:00:00Z").toISOString();
const YESTERDAY = new Date(new Date(NOW).getTime() - 86400000).toISOString();

function makeMemory(overrides: Partial<ScoredMemory> = {}): ScoredMemory {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    content: "Team manages 12 active projects across 3 departments",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: NOW,
    semantic_score: 0.8,
    keyword_score: 0.5,
    final_score: 0.7,
    ...overrides,
  };
}

describe("extractBigrams", () => {
  it("extracts word bigrams", () => {
    const bigrams = extractBigrams("team has 12 active");
    assert.ok(bigrams.has("team has"));
    assert.ok(bigrams.has("has 12"));
    assert.ok(bigrams.has("12 active"));
    assert.equal(bigrams.size, 3);
  });

  it("returns empty set for single word", () => {
    assert.equal(extractBigrams("corn").size, 0);
  });

  it("is case-insensitive", () => {
    const a = extractBigrams("Team Has");
    const b = extractBigrams("team has");
    assert.deepEqual(a, b);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1.0 for identical sets", () => {
    const a = new Set(["a b", "b c"]);
    assert.equal(jaccardSimilarity(a, a), 1.0);
  });

  it("returns 0.0 for disjoint sets", () => {
    const a = new Set(["a b"]);
    const b = new Set(["c d"]);
    assert.equal(jaccardSimilarity(a, b), 0);
  });

  it("returns 0.0 for two empty sets", () => {
    assert.equal(jaccardSimilarity(new Set(), new Set()), 0);
  });

  it("computes partial overlap correctly", () => {
    const a = new Set(["a b", "b c", "c d"]);
    const b = new Set(["a b", "c d", "d e"]);
    // intersection = 2 (a b, c d), union = 4
    assert.equal(jaccardSimilarity(a, b), 0.5);
  });
});

describe("filterContradictions", () => {
  it("keeps newer memory when same-type memories are similar", () => {
    const older = makeMemory({
      id: "old",
      content: "Team manages 10 active projects and 5 proposals",
      memory_type: "fact",
      created_at: YESTERDAY,
    });
    const newer = makeMemory({
      id: "new",
      content: "Team manages 12 active projects and 5 proposals",
      memory_type: "fact",
      created_at: NOW,
    });
    const cache = new Map([
      ["old", extractBigrams(older.content)],
      ["new", extractBigrams(newer.content)],
    ]);
    const result = filterContradictions([older, newer], cache);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "new");
  });

  it("keeps both when different types", () => {
    const fact = makeMemory({
      id: "fact",
      content: "Team manages 12 active projects and 5 proposals",
      memory_type: "fact",
      created_at: NOW,
    });
    const pref = makeMemory({
      id: "pref",
      content: "Team manages 12 active projects and 5 proposals",
      memory_type: "preference",
      created_at: NOW,
    });
    const cache = new Map([
      ["fact", extractBigrams(fact.content)],
      ["pref", extractBigrams(pref.content)],
    ]);
    const result = filterContradictions([fact, pref], cache);
    assert.equal(result.length, 2);
  });

  it("keeps both when content is dissimilar", () => {
    const a = makeMemory({
      id: "a",
      content: "Team manages 12 active projects across 3 departments",
      memory_type: "fact",
      created_at: NOW,
    });
    const b = makeMemory({
      id: "b",
      content: "Completed the compliance audit for Eastern division yesterday",
      memory_type: "fact",
      created_at: YESTERDAY,
    });
    const cache = new Map([
      ["a", extractBigrams(a.content)],
      ["b", extractBigrams(b.content)],
    ]);
    const result = filterContradictions([a, b], cache);
    assert.equal(result.length, 2);
  });
});

describe("packMemoryContext", () => {
  it("returns empty for no memories", () => {
    const result = packMemoryContext([]);
    assert.equal(result.formatted, "");
    assert.equal(result.includedCount, 0);
    assert.equal(result.tokenCount, 0);
  });

  it("filters out below-threshold memories", () => {
    const result = packMemoryContext([
      makeMemory({ id: "good", final_score: 0.5 }),
      makeMemory({ id: "bad", final_score: 0.1 }),
    ]);
    assert.equal(result.includedCount, 1);
    assert.ok(result.includedMemoryIds.includes("good"));
    assert.ok(!result.includedMemoryIds.includes("bad"));
  });

  it("enforces token budget", () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      makeMemory({
        id: `mem-${i}`,
        final_score: 0.9 - i * 0.01,
        content: `Memory item number ${i} with some additional context about operations`,
      })
    );
    const result = packMemoryContext(memories, { tokenBudget: 150 });
    assert.ok(result.includedCount < 20, `Expected < 20 included, got ${result.includedCount}`);
    assert.ok(result.tokenCount <= 150, `Expected <= 150 tokens, got ${result.tokenCount}`);
  });

  it("includes memory type, confidence, and tier in formatted output", () => {
    const result = packMemoryContext([
      makeMemory({ memory_type: "fact", confidence: 0.9, memory_tier: "knowledge" }),
    ]);
    assert.ok(result.formatted.includes("[fact]"));
    assert.ok(result.formatted.includes("90% confidence"));
    assert.ok(result.formatted.includes("knowledge"));
  });

  it("returns correct candidateCount even when all filtered", () => {
    const result = packMemoryContext([
      makeMemory({ final_score: 0.1 }),
      makeMemory({ final_score: 0.2 }),
    ]);
    assert.equal(result.candidateCount, 2);
    assert.equal(result.includedCount, 0);
  });

  it("uses custom score threshold", () => {
    const result = packMemoryContext(
      [makeMemory({ final_score: 0.4 })],
      { scoreThreshold: 0.5 }
    );
    assert.equal(result.includedCount, 0);
  });

  it("always includes at least one memory if above threshold", () => {
    const result = packMemoryContext(
      [makeMemory({ final_score: 0.3, content: "x".repeat(10000) })],
      { tokenBudget: 10 }
    );
    assert.equal(result.includedCount, 1);
  });

  it("deduplicates near-identical same-type memories (only one packed)", () => {
    const m1 = makeMemory({
      id: "dup1",
      content: "Team manages 12 active projects and 5 proposals in North America",
      final_score: 0.9,
      memory_type: "fact",
      created_at: NOW,
    });
    const m2 = makeMemory({
      id: "dup2",
      content: "Team manages 12 active projects and 5 proposals in North America Eastern division",
      final_score: 0.85,
      memory_type: "fact",
      created_at: YESTERDAY,
    });
    const result = packMemoryContext([m1, m2]);
    // Contradiction filter should remove the older one
    assert.equal(result.includedCount, 1);
    assert.ok(result.includedMemoryIds.includes("dup1"));
  });

  it("includes diverse topics even if second has lower score", () => {
    const projects = makeMemory({
      id: "projects",
      content: "Team processes 1200 support tickets in North America every quarter",
      final_score: 0.9,
      memory_type: "fact",
    });
    const weather = makeMemory({
      id: "weather",
      content: "Prefers morning weather reports at 6am before fieldwork begins",
      final_score: 0.6,
      memory_type: "preference",
    });
    const result = packMemoryContext([projects, weather]);
    assert.equal(result.includedCount, 2);
    assert.ok(result.includedMemoryIds.includes("projects"));
    assert.ok(result.includedMemoryIds.includes("weather"));
  });
});
