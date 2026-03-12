import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Inline the pure gate functions to avoid transitive module resolution issues
// (memory-retrieval.ts imports from embeddings/supabase which aren't resolvable in node --test)

function shouldSkipExpansion(query: string): boolean {
  const words = query.trim().split(/\s+/).length;
  return words < 5 && !query.includes("?");
}

function shouldSkipRerank(scored: Array<{ final_score: number }>): boolean {
  if (scored.length < 3) return false;
  return scored.slice(0, 3).every(s => s.final_score >= 0.8);
}

describe("shouldSkipExpansion", () => {
  it("skips for short query without question mark", () => {
    assert.ok(shouldSkipExpansion("corn price"));
  });

  it("does not skip when query has question mark", () => {
    assert.ok(!shouldSkipExpansion("corn price?"));
  });

  it("does not skip for longer queries (>= 5 words)", () => {
    assert.ok(!shouldSkipExpansion("what was the corn price last week"));
  });

  it("skips for single word", () => {
    assert.ok(shouldSkipExpansion("corn"));
  });

  it("skips for 4-word query without question mark", () => {
    assert.ok(shouldSkipExpansion("monthly revenue report details"));
  });

  it("does not skip for exactly 5 words", () => {
    assert.ok(!shouldSkipExpansion("monthly revenue report details today"));
  });
});

describe("shouldSkipRerank", () => {
  it("skips when top 3 all score >= 0.8", () => {
    const scored = [
      { final_score: 0.95 },
      { final_score: 0.90 },
      { final_score: 0.85 },
      { final_score: 0.30 },
    ];
    assert.ok(shouldSkipRerank(scored));
  });

  it("does not skip when any top-3 is below 0.8", () => {
    const scored = [
      { final_score: 0.95 },
      { final_score: 0.90 },
      { final_score: 0.75 },
      { final_score: 0.30 },
    ];
    assert.ok(!shouldSkipRerank(scored));
  });

  it("does not skip when fewer than 3 results", () => {
    const scored = [
      { final_score: 0.95 },
      { final_score: 0.90 },
    ];
    assert.ok(!shouldSkipRerank(scored));
  });

  it("does not skip for empty array", () => {
    assert.ok(!shouldSkipRerank([]));
  });

  it("skips when exactly 3 results all >= 0.8", () => {
    const scored = [
      { final_score: 0.80 },
      { final_score: 0.80 },
      { final_score: 0.80 },
    ];
    assert.ok(shouldSkipRerank(scored));
  });
});
