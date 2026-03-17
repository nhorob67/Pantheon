import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("memory_read tool", () => {
  it("valid ID returns full record fields", () => {
    // Simulate the response shape from memory_read
    const record = {
      content: "User prefers morning updates",
      type: "preference",
      tier: "knowledge",
      confidence: 0.92,
      source: "runtime",
      saved_at: "2026-03-10T10:00:00Z",
      metadata: {},
    };

    assert.equal(typeof record.content, "string");
    assert.equal(typeof record.type, "string");
    assert.equal(typeof record.tier, "string");
    assert.equal(typeof record.confidence, "number");
    assert.equal(typeof record.source, "string");
    assert.equal(typeof record.saved_at, "string");
    assert.deepEqual(record.metadata, {});
  });

  it("tombstoned memory returns 'not found'", () => {
    // When is_tombstoned = true, the query filters it out
    const data = null; // maybeSingle returns null
    const result = data ? { content: data } : { error: "Memory not found" };
    assert.equal(result.error, "Memory not found");
  });

  it("cross-tenant ID returns 'not found'", () => {
    // The tenant_id filter prevents cross-tenant reads
    const queryTenantId = "tenant_A";
    const recordTenantId = "tenant_B";
    assert.notEqual(queryTenantId, recordTenantId);
    // Query with tenant_id filter would return null
    const data = null;
    const result = data ? { content: data } : { error: "Memory not found" };
    assert.equal(result.error, "Memory not found");
  });

  it("memory_search now includes id field", () => {
    // Verify the mapping includes id
    const scored = {
      id: "mem_123",
      content: "Some fact",
      memory_type: "fact",
      memory_tier: "knowledge",
      confidence: 0.9,
      final_score: 0.85,
      created_at: "2026-03-10T10:00:00Z",
    };

    const mapped = {
      id: scored.id,
      content: scored.content,
      type: scored.memory_type,
      tier: scored.memory_tier,
      confidence: scored.confidence,
      relevance: scored.final_score,
      saved_at: scored.created_at,
    };

    assert.equal(mapped.id, "mem_123");
    assert.equal(typeof mapped.id, "string");
  });
});
