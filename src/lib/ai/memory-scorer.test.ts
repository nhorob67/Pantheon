import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreMemories, computeRecencyScore, computeTrustScore, getHalfLifeDays } from "./memory-scorer.ts";

const NOW = new Date("2026-02-24T12:00:00Z");

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1",
    content: "Team manages 12 active projects",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: NOW.toISOString(),
    semantic_score: 0.8,
    keyword_score: 0.5,
    ...overrides,
  };
}

describe("getHalfLifeDays", () => {
  it("returns 90 for knowledge/fact", () => {
    assert.equal(getHalfLifeDays("knowledge", "fact"), 90);
  });

  it("returns 7 for working/outcome", () => {
    assert.equal(getHalfLifeDays("working", "outcome"), 7);
  });

  it("returns 30 for episodic/outcome", () => {
    assert.equal(getHalfLifeDays("episodic", "outcome"), 30);
  });

  it("returns default 30 when tier is undefined", () => {
    assert.equal(getHalfLifeDays(undefined, "fact"), 30);
  });

  it("returns default 30 when type is undefined", () => {
    assert.equal(getHalfLifeDays("knowledge", undefined), 30);
  });

  it("returns default 30 for unknown tier", () => {
    assert.equal(getHalfLifeDays("unknown", "fact"), 30);
  });
});

describe("computeRecencyScore", () => {
  it("returns ~1.0 for today (backward-compatible no tier/type)", () => {
    const score = computeRecencyScore(NOW.toISOString(), NOW);
    assert.ok(score > 0.99 && score <= 1.0, `Expected ~1.0, got ${score}`);
  });

  it("returns ~0.85 for 7 days ago (default half-life)", () => {
    const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(sevenDaysAgo.toISOString(), NOW);
    assert.ok(score > 0.8 && score < 0.9, `Expected ~0.85, got ${score}`);
  });

  it("returns ~0.50 for 30 days ago (default half-life)", () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(thirtyDaysAgo.toISOString(), NOW);
    assert.ok(score > 0.45 && score < 0.55, `Expected ~0.50, got ${score}`);
  });

  it("floors at 0.05 for very old memories", () => {
    const yearAgo = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(yearAgo.toISOString(), NOW);
    assert.ok(score >= 0.05 && score < 0.1, `Expected ~0.05, got ${score}`);
  });

  it("knowledge/fact at 30 days → score > 0.7 (half-life 90d)", () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(thirtyDaysAgo.toISOString(), NOW, "knowledge", "fact");
    // 90d half-life: exp(-30*ln2/90) ≈ 0.794
    assert.ok(score > 0.7, `Expected > 0.7, got ${score}`);
  });

  it("working/outcome at 14 days → score ~0.25 (half-life 7d)", () => {
    const fourteenDaysAgo = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(fourteenDaysAgo.toISOString(), NOW, "working", "outcome");
    assert.ok(score > 0.20 && score < 0.30, `Expected ~0.25, got ${score}`);
  });

  it("no tier/type → uses default 30d (backward-compatible)", () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(thirtyDaysAgo.toISOString(), NOW);
    assert.ok(score > 0.45 && score < 0.55, `Expected ~0.50, got ${score}`);
  });
});

describe("computeTrustScore", () => {
  it("knowledge tier gets full weight", () => {
    assert.equal(computeTrustScore(0.9, "knowledge"), 0.9);
  });

  it("episodic tier gets 0.7 weight", () => {
    const score = computeTrustScore(0.9, "episodic");
    assert.ok(Math.abs(score - 0.63) < 0.01, `Expected ~0.63, got ${score}`);
  });

  it("working tier gets 0.4 weight", () => {
    const score = computeTrustScore(0.9, "working");
    assert.ok(Math.abs(score - 0.36) < 0.01, `Expected ~0.36, got ${score}`);
  });

  it("unknown tier defaults to working weight", () => {
    assert.equal(computeTrustScore(1.0, "unknown"), 0.4);
  });
});

describe("scoreMemories", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(scoreMemories([]), []);
  });

  it("computes final_score with all components", () => {
    const results = scoreMemories([makeCandidate()], { now: NOW });
    assert.equal(results.length, 1);
    const score = results[0].final_score;
    assert.ok(score > 0.9, `Expected > 0.9, got ${score}`);
  });

  it("applies cross-match bonus for candidates with both scores", () => {
    const withBoth = makeCandidate({ semantic_score: 0.5, keyword_score: 0.3 });
    const semanticOnly = makeCandidate({ id: "mem-2", semantic_score: 0.5, keyword_score: 0 });
    const results = scoreMemories([withBoth, semanticOnly], { now: NOW });
    assert.ok(
      results.find((r) => r.id === "mem-1")!.final_score >
        results.find((r) => r.id === "mem-2")!.final_score,
      "Cross-match candidate should score higher"
    );
  });

  it("caps final_score at 1.0", () => {
    const perfect = makeCandidate({
      semantic_score: 1.0,
      keyword_score: 1.0,
      confidence: 1.0,
      memory_tier: "knowledge",
    });
    const results = scoreMemories([perfect], { now: NOW });
    assert.ok(results[0].final_score <= 1.0, `Score should be capped at 1.0, got ${results[0].final_score}`);
  });

  it("normalizes keyword scores within batch", () => {
    const high = makeCandidate({ id: "high", keyword_score: 10.0, semantic_score: 0 });
    const low = makeCandidate({ id: "low", keyword_score: 5.0, semantic_score: 0 });
    const results = scoreMemories([high, low], { now: NOW });
    const highResult = results.find((r) => r.id === "high")!;
    const lowResult = results.find((r) => r.id === "low")!;
    assert.equal(highResult.keyword_score, 1.0);
    assert.equal(lowResult.keyword_score, 0.5);
  });

  it("recency affects ranking for same content", () => {
    const recent = makeCandidate({
      id: "recent",
      created_at: NOW.toISOString(),
      semantic_score: 0.7,
      keyword_score: 0,
    });
    const old = makeCandidate({
      id: "old",
      created_at: new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      semantic_score: 0.7,
      keyword_score: 0,
    });
    const results = scoreMemories([recent, old], { now: NOW });
    const recentScore = results.find((r) => r.id === "recent")!.final_score;
    const oldScore = results.find((r) => r.id === "old")!.final_score;
    assert.ok(recentScore > oldScore, `Recent (${recentScore}) should score above old (${oldScore})`);
  });

  it("knowledge tier ranks above working tier for same content", () => {
    const knowledge = makeCandidate({
      id: "know",
      memory_tier: "knowledge",
      confidence: 0.9,
      semantic_score: 0.7,
      keyword_score: 0,
    });
    const working = makeCandidate({
      id: "work",
      memory_tier: "working",
      confidence: 0.9,
      semantic_score: 0.7,
      keyword_score: 0,
    });
    const results = scoreMemories([knowledge, working], { now: NOW });
    const knowScore = results.find((r) => r.id === "know")!.final_score;
    const workScore = results.find((r) => r.id === "work")!.final_score;
    assert.ok(knowScore > workScore, `Knowledge (${knowScore}) should score above working (${workScore})`);
  });
});
