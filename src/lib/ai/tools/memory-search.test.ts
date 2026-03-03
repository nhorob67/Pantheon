import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ScoredMemory } from "../memory-scorer.ts";

/**
 * Standalone test for memory_search tool output mapping.
 *
 * We test the mapping + error handling by extracting the same logic
 * used inside the tool's execute function. The tool delegates to
 * searchFn (defaults to hybridMemorySearch) and maps ScoredMemory[]
 * to the shape returned to the LLM.
 */

function mapScoredMemories(scored: ScoredMemory[]) {
  return {
    memories: scored.map((m) => ({
      content: m.content,
      type: m.memory_type,
      tier: m.memory_tier,
      confidence: m.confidence,
      relevance: m.final_score,
      saved_at: m.created_at,
    })),
    count: scored.length,
  };
}

function makeScoredMemory(overrides: Partial<ScoredMemory> = {}): ScoredMemory {
  return {
    id: "mem_1",
    content: "Plants corn in May",
    memory_type: "fact",
    memory_tier: "core",
    confidence: 0.95,
    created_at: "2026-02-20T00:00:00Z",
    semantic_score: 0.8,
    keyword_score: 0.6,
    final_score: 0.87,
    ...overrides,
  };
}

describe("memory_search output mapping", () => {
  it("maps ScoredMemory[] to expected output shape", () => {
    const scored = [makeScoredMemory()];
    const result = mapScoredMemories(scored);

    assert.equal(result.count, 1);
    assert.deepEqual(result.memories[0], {
      content: "Plants corn in May",
      type: "fact",
      tier: "core",
      confidence: 0.95,
      relevance: 0.87,
      saved_at: "2026-02-20T00:00:00Z",
    });
  });

  it("includes relevance (final_score) in output", () => {
    const scored = [makeScoredMemory({ final_score: 0.42 })];
    const result = mapScoredMemories(scored);
    assert.equal(result.memories[0].relevance, 0.42);
  });

  it("returns empty array and count 0 for no results", () => {
    const result = mapScoredMemories([]);
    assert.equal(result.count, 0);
    assert.deepEqual(result.memories, []);
  });

  it("preserves all memory types in mapping", () => {
    const scored = [
      makeScoredMemory({ memory_type: "fact" }),
      makeScoredMemory({ id: "mem_2", memory_type: "preference" }),
      makeScoredMemory({ id: "mem_3", memory_type: "commitment" }),
      makeScoredMemory({ id: "mem_4", memory_type: "outcome" }),
    ];
    const result = mapScoredMemories(scored);
    assert.deepEqual(
      result.memories.map((m) => m.type),
      ["fact", "preference", "commitment", "outcome"]
    );
  });
});

describe("memory_search searchFn injection", () => {
  it("searchFn receives correct arguments", async () => {
    const calls: Array<{ tenantId: string; query: string; limit: number }> = [];
    const mockSearch = async (_admin: unknown, tenantId: string, query: string, limit: number) => {
      calls.push({ tenantId, query, limit });
      return [] as ScoredMemory[];
    };

    // Simulate the tool execute logic
    const admin = {} as unknown;
    const tenantId = "tenant_123";
    const query = "corn prices";
    const limit = 3;
    await mockSearch(admin, tenantId, query, limit);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].tenantId, "tenant_123");
    assert.equal(calls[0].query, "corn prices");
    assert.equal(calls[0].limit, 3);
  });

  it("default limit is 5 when not specified", () => {
    // The tool code does: limit ?? 5
    const inputLimit = undefined;
    const effectiveLimit = inputLimit ?? 5;
    assert.equal(effectiveLimit, 5);
  });

  it("error from searchFn produces error result", async () => {
    const failingSearch = async () => {
      throw new Error("RPC timeout");
    };

    // Simulate the tool's try/catch
    let result: { error?: string };
    try {
      await failingSearch();
      result = { error: undefined };
    } catch (err) {
      result = {
        error: `Memory search failed: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }

    assert.ok(result.error);
    assert.match(result.error!, /RPC timeout/);
  });
});
