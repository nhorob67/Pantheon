import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decomposeQuery } from "./query-decomposer.ts";

describe("decomposeQuery", () => {
  it("returns original for simple query", () => {
    const result = decomposeQuery("Where do I deliver corn?");
    assert.deepEqual(result, ["Where do I deliver corn?"]);
  });

  it("splits on conjunctions", () => {
    const result = decomposeQuery("corn bids and weather forecast");
    assert.equal(result.length, 3);
    assert.equal(result[0], "corn bids and weather forecast");
    assert.ok(result.includes("corn bids"));
    assert.ok(result.includes("weather forecast"));
  });

  it("splits on 'also'", () => {
    const result = decomposeQuery("grain prices also planting schedule");
    assert.ok(result.length > 1);
    assert.ok(result.includes("grain prices also planting schedule"));
  });

  it("splits on 'plus'", () => {
    const result = decomposeQuery("spray windows plus field conditions");
    assert.ok(result.length > 1);
  });

  it("splits on 'as well as'", () => {
    const result = decomposeQuery("corn prices as well as soybean prices");
    assert.ok(result.length > 1);
  });

  it("splits on embedded question words", () => {
    const result = decomposeQuery("what are corn bids where do I deliver");
    assert.ok(result.length > 1);
    assert.equal(result[0], "what are corn bids where do I deliver");
  });

  it("splits on multiple crop mentions", () => {
    const result = decomposeQuery("compare corn and soybeans prices");
    // Should split on conjunction OR crops
    assert.ok(result.length > 1);
  });

  it("caps at 3 sub-queries max", () => {
    const result = decomposeQuery("corn and soybeans and wheat and barley");
    assert.ok(result.length <= 3, `Expected <= 3, got ${result.length}`);
  });

  it("returns original for empty query", () => {
    const result = decomposeQuery("");
    assert.deepEqual(result, [""]);
  });

  it("returns original for single-word query", () => {
    const result = decomposeQuery("corn");
    assert.deepEqual(result, ["corn"]);
  });

  it("does not split very short parts", () => {
    // "a and b" -> parts are "a" and "b", both < 5 chars, so no split
    const result = decomposeQuery("a and b");
    assert.deepEqual(result, ["a and b"]);
  });

  it("handles whitespace", () => {
    const result = decomposeQuery("  corn bids  ");
    assert.deepEqual(result, ["corn bids"]);
  });
});
