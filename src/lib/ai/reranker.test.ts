import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseRerankResponse,
  getBlendWeights,
  type RerankedMemory,
} from "./reranker.ts";
import type { ScoredMemory } from "./memory-scorer.ts";

function makeScoredMemory(id: string, finalScore: number): ScoredMemory {
  return {
    id,
    content: `Memory content for ${id}`,
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: new Date().toISOString(),
    semantic_score: 0.8,
    keyword_score: 0.5,
    final_score: finalScore,
  };
}

describe("parseRerankResponse", () => {
  it("parses valid JSON array", () => {
    const result = parseRerankResponse("[0.9, 0.3, 0.7]", 3);
    assert.deepEqual(result, [0.9, 0.3, 0.7]);
  });

  it("returns null for mismatched count", () => {
    const result = parseRerankResponse("[0.9, 0.3]", 3);
    assert.equal(result, null);
  });

  it("returns null for non-array JSON", () => {
    const result = parseRerankResponse('{"scores": [0.9]}', 1);
    assert.equal(result, null);
  });

  it("returns null for NaN values", () => {
    const result = parseRerankResponse('[0.9, "bad", 0.7]', 3);
    assert.equal(result, null);
  });

  it("clamps values to [0, 1]", () => {
    const result = parseRerankResponse("[1.5, -0.3, 0.7]", 3);
    assert.ok(result !== null);
    assert.equal(result![0], 1.0);
    assert.equal(result![1], 0.0);
    assert.equal(result![2], 0.7);
  });

  it("strips markdown fences", () => {
    const result = parseRerankResponse("```json\n[0.8, 0.2]\n```", 2);
    assert.deepEqual(result, [0.8, 0.2]);
  });

  it("returns null for invalid JSON", () => {
    const result = parseRerankResponse("not json", 1);
    assert.equal(result, null);
  });

  it("handles empty array for expected count 0", () => {
    const result = parseRerankResponse("[]", 0);
    assert.deepEqual(result, []);
  });
});

describe("getBlendWeights", () => {
  it("positions 1-3 favor retrieval (75/25)", () => {
    for (const pos of [1, 2, 3]) {
      const w = getBlendWeights(pos);
      assert.equal(w.retrieval, 0.75, `Position ${pos} retrieval`);
      assert.equal(w.rerank, 0.25, `Position ${pos} rerank`);
    }
  });

  it("positions 4-7 are balanced (60/40)", () => {
    for (const pos of [4, 5, 6, 7]) {
      const w = getBlendWeights(pos);
      assert.equal(w.retrieval, 0.60, `Position ${pos} retrieval`);
      assert.equal(w.rerank, 0.40, `Position ${pos} rerank`);
    }
  });

  it("positions 8+ favor reranker (40/60)", () => {
    for (const pos of [8, 9, 10]) {
      const w = getBlendWeights(pos);
      assert.equal(w.retrieval, 0.40, `Position ${pos} retrieval`);
      assert.equal(w.rerank, 0.60, `Position ${pos} rerank`);
    }
  });
});

describe("RerankedMemory shape", () => {
  it("preserves all ScoredMemory fields", () => {
    const scored = makeScoredMemory("mem-1", 0.85);
    const reranked: RerankedMemory = {
      ...scored,
      rerank_score: 0.9,
      blended_score: 0.87,
    };
    assert.equal(reranked.id, "mem-1");
    assert.equal(reranked.content, scored.content);
    assert.equal(reranked.final_score, 0.85);
    assert.equal(reranked.rerank_score, 0.9);
    assert.equal(reranked.blended_score, 0.87);
  });

  it("identity fallback sets blended_score = final_score", () => {
    const scored = makeScoredMemory("mem-1", 0.72);
    const fallback: RerankedMemory = {
      ...scored,
      rerank_score: scored.final_score,
      blended_score: scored.final_score,
    };
    assert.equal(fallback.blended_score, 0.72);
    assert.equal(fallback.rerank_score, 0.72);
  });
});
