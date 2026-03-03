import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isQueryRuntimeTool,
  normalizeScaleTicketQueryArgs,
  normalizeGrainBidQueryArgs,
  normalizeMemorySearchArgs,
} from "./tenant-runtime-query-tools.ts";

// ---------------------------------------------------------------------------
// isQueryRuntimeTool
// ---------------------------------------------------------------------------

describe("isQueryRuntimeTool", () => {
  it("returns true for tenant_scale_ticket_query", () => {
    assert.strictEqual(isQueryRuntimeTool("tenant_scale_ticket_query"), true);
  });
  it("returns true for tenant_grain_bid_query", () => {
    assert.strictEqual(isQueryRuntimeTool("tenant_grain_bid_query"), true);
  });
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
// normalizeScaleTicketQueryArgs
// ---------------------------------------------------------------------------

describe("normalizeScaleTicketQueryArgs", () => {
  it("applies defaults for empty args", () => {
    const result = normalizeScaleTicketQueryArgs({});
    assert.strictEqual(result.limit, 50);
    assert.strictEqual(result.order_by, "date DESC");
    assert.strictEqual(result.aggregation, "none");
    assert.strictEqual(result.date_from, null);
    assert.strictEqual(result.date_to, null);
    assert.strictEqual(result.crop, null);
    assert.strictEqual(result.elevator, null);
    assert.strictEqual(result.field, null);
  });

  it("clamps limit to max 200", () => {
    const result = normalizeScaleTicketQueryArgs({ limit: 999 });
    assert.strictEqual(result.limit, 200);
  });

  it("defaults limit when negative", () => {
    const result = normalizeScaleTicketQueryArgs({ limit: -5 });
    assert.strictEqual(result.limit, 50);
  });

  it("defaults limit when zero", () => {
    const result = normalizeScaleTicketQueryArgs({ limit: 0 });
    assert.strictEqual(result.limit, 50);
  });

  it("parses limit from string", () => {
    const result = normalizeScaleTicketQueryArgs({ limit: "25" });
    assert.strictEqual(result.limit, 25);
  });

  it("accepts valid order_by values", () => {
    const result = normalizeScaleTicketQueryArgs({
      order_by: "bushels DESC",
    });
    assert.strictEqual(result.order_by, "bushels DESC");
  });

  it("rejects invalid order_by", () => {
    assert.throws(
      () =>
        normalizeScaleTicketQueryArgs({
          order_by: "DROP TABLE; --",
        }),
      /order_by must be one of/
    );
  });

  it("accepts valid aggregation values", () => {
    const result = normalizeScaleTicketQueryArgs({
      aggregation: "sum_by_crop",
    });
    assert.strictEqual(result.aggregation, "sum_by_crop");
  });

  it("rejects invalid aggregation", () => {
    assert.throws(
      () =>
        normalizeScaleTicketQueryArgs({
          aggregation: "bad_value",
        }),
      /aggregation must be one of/
    );
  });

  it("preserves optional string filters", () => {
    const result = normalizeScaleTicketQueryArgs({
      date_from: "2026-01-01",
      date_to: "2026-12-31",
      crop: "corn",
      elevator: "CHS",
      field: "North 40",
    });
    assert.strictEqual(result.date_from, "2026-01-01");
    assert.strictEqual(result.date_to, "2026-12-31");
    assert.strictEqual(result.crop, "corn");
    assert.strictEqual(result.elevator, "CHS");
    assert.strictEqual(result.field, "North 40");
  });

  it("trims whitespace-only strings to null", () => {
    const result = normalizeScaleTicketQueryArgs({
      crop: "   ",
      elevator: "\t",
    });
    assert.strictEqual(result.crop, null);
    assert.strictEqual(result.elevator, null);
  });
});

// ---------------------------------------------------------------------------
// normalizeGrainBidQueryArgs
// ---------------------------------------------------------------------------

describe("normalizeGrainBidQueryArgs", () => {
  it("applies default max_age_hours of 24", () => {
    const result = normalizeGrainBidQueryArgs({});
    assert.strictEqual(result.max_age_hours, 24);
    assert.strictEqual(result.elevator_key, null);
    assert.strictEqual(result.crop, null);
  });

  it("accepts numeric max_age_hours", () => {
    const result = normalizeGrainBidQueryArgs({ max_age_hours: 48 });
    assert.strictEqual(result.max_age_hours, 48);
  });

  it("parses max_age_hours from string", () => {
    const result = normalizeGrainBidQueryArgs({ max_age_hours: "12" });
    assert.strictEqual(result.max_age_hours, 12);
  });

  it("defaults max_age_hours for negative values", () => {
    const result = normalizeGrainBidQueryArgs({ max_age_hours: -1 });
    assert.strictEqual(result.max_age_hours, 24);
  });

  it("defaults max_age_hours for zero", () => {
    const result = normalizeGrainBidQueryArgs({ max_age_hours: 0 });
    assert.strictEqual(result.max_age_hours, 24);
  });

  it("defaults max_age_hours for non-numeric string", () => {
    const result = normalizeGrainBidQueryArgs({ max_age_hours: "abc" });
    assert.strictEqual(result.max_age_hours, 24);
  });

  it("preserves optional filters", () => {
    const result = normalizeGrainBidQueryArgs({
      elevator_key: "chs_fargo",
      crop: "soybeans",
    });
    assert.strictEqual(result.elevator_key, "chs_fargo");
    assert.strictEqual(result.crop, "soybeans");
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
