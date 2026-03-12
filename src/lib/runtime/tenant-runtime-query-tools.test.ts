import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isQueryRuntimeTool,
  normalizeMemorySearchArgs,
} from "./tenant-runtime-query-tools.ts";

// ---------------------------------------------------------------------------
// isQueryRuntimeTool
// ---------------------------------------------------------------------------

describe("isQueryRuntimeTool", () => {
  it("returns true for tenant_memory_search", () => {
    assert.strictEqual(isQueryRuntimeTool("tenant_memory_search"), true);
  });
  it("returns false for unknown tools", () => {
    assert.strictEqual(isQueryRuntimeTool("echo"), false);
    assert.strictEqual(isQueryRuntimeTool("tenant_memory_write"), false);
    assert.strictEqual(isQueryRuntimeTool(""), false);
  });
});

// ---------------------------------------------------------------------------
// normalizeMemorySearchArgs
// ---------------------------------------------------------------------------

describe("normalizeMemorySearchArgs", () => {
  it("requires query_text", () => {
    assert.throws(
      () => normalizeMemorySearchArgs({}),
      /tenant_memory_search requires query_text/
    );
  });

  it("rejects empty string query_text", () => {
    assert.throws(
      () => normalizeMemorySearchArgs({ query_text: "   " }),
      /tenant_memory_search requires query_text/
    );
  });

  it("applies default limit of 10", () => {
    const result = normalizeMemorySearchArgs({ query_text: "fungicide" });
    assert.strictEqual(result.limit, 10);
    assert.strictEqual(result.memory_tier, null);
  });

  it("clamps limit to max 50", () => {
    const result = normalizeMemorySearchArgs({
      query_text: "fungicide",
      limit: 500,
    });
    assert.strictEqual(result.limit, 50);
  });

  it("accepts valid memory_tier", () => {
    const result = normalizeMemorySearchArgs({
      query_text: "weather",
      memory_tier: "working",
    });
    assert.strictEqual(result.memory_tier, "working");
  });

  it("accepts episodic memory_tier", () => {
    const result = normalizeMemorySearchArgs({
      query_text: "weather",
      memory_tier: "episodic",
    });
    assert.strictEqual(result.memory_tier, "episodic");
  });

  it("accepts knowledge memory_tier", () => {
    const result = normalizeMemorySearchArgs({
      query_text: "weather",
      memory_tier: "knowledge",
    });
    assert.strictEqual(result.memory_tier, "knowledge");
  });

  it("rejects invalid memory_tier", () => {
    assert.throws(
      () =>
        normalizeMemorySearchArgs({
          query_text: "weather",
          memory_tier: "invalid",
        }),
      /memory_tier must be one of/
    );
  });

  it("returns null memory_tier when not provided", () => {
    const result = normalizeMemorySearchArgs({ query_text: "test" });
    assert.strictEqual(result.memory_tier, null);
  });

  it("trims query_text", () => {
    const result = normalizeMemorySearchArgs({
      query_text: "  spray window  ",
    });
    assert.strictEqual(result.query_text, "spray window");
  });
});
