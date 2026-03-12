import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decomposeQuery } from "./query-decomposer.ts";

describe("decomposeQuery", () => {
  it("returns original for simple query", () => {
    const result = decomposeQuery("Where do I submit reports?");
    assert.deepEqual(result, ["Where do I submit reports?"]);
  });

  it("splits on conjunctions", () => {
    const result = decomposeQuery("project status and budget forecast");
    assert.equal(result.length, 3);
    assert.equal(result[0], "project status and budget forecast");
    assert.ok(result.includes("project status"));
    assert.ok(result.includes("budget forecast"));
  });

  it("splits on 'also'", () => {
    const result = decomposeQuery("revenue metrics also hiring schedule");
    assert.ok(result.length > 1);
    assert.ok(result.includes("revenue metrics also hiring schedule"));
  });

  it("splits on 'plus'", () => {
    const result = decomposeQuery("sprint velocity plus team capacity");
    assert.ok(result.length > 1);
  });

  it("splits on 'as well as'", () => {
    const result = decomposeQuery("project costs as well as resource costs");
    assert.ok(result.length > 1);
  });

  it("splits on embedded question words", () => {
    const result = decomposeQuery("what are project costs where do I submit");
    assert.ok(result.length > 1);
    assert.equal(result[0], "what are project costs where do I submit");
  });

  it("splits on multiple topic mentions", () => {
    const result = decomposeQuery("compare revenue and expenses totals");
    // Should split on conjunction
    assert.ok(result.length > 1);
  });

  it("caps at 3 sub-queries max", () => {
    const result = decomposeQuery("revenue and expenses and headcount and forecasts");
    assert.ok(result.length <= 3, `Expected <= 3, got ${result.length}`);
  });

  it("returns original for empty query", () => {
    const result = decomposeQuery("");
    assert.deepEqual(result, [""]);
  });

  it("returns original for single-word query", () => {
    const result = decomposeQuery("revenue");
    assert.deepEqual(result, ["revenue"]);
  });

  it("does not split very short parts", () => {
    // "a and b" -> parts are "a" and "b", both < 5 chars, so no split
    const result = decomposeQuery("a and b");
    assert.deepEqual(result, ["a and b"]);
  });

  it("handles whitespace", () => {
    const result = decomposeQuery("  project status  ");
    assert.deepEqual(result, ["project status"]);
  });
});
