import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateJson } from "../json-generator.ts";
import type { JsonContent } from "../../../types/file-creation.ts";

describe("generateJson", () => {
  it("generates pretty-printed JSON", () => {
    const content: JsonContent = {
      type: "json",
      data: { name: "Alice", age: 30 },
    };

    const buffer = generateJson(content);
    const text = buffer.toString("utf-8");
    const parsed = JSON.parse(text);

    assert.deepEqual(parsed, { name: "Alice", age: 30 });
    // Verify pretty-printed (has newlines)
    assert.ok(text.includes("\n"));
  });

  it("handles nested objects", () => {
    const content: JsonContent = {
      type: "json",
      data: { a: { b: { c: [1, 2, 3] } } },
    };

    const buffer = generateJson(content);
    const parsed = JSON.parse(buffer.toString("utf-8"));
    assert.deepEqual(parsed.a.b.c, [1, 2, 3]);
  });

  it("handles arrays", () => {
    const content: JsonContent = {
      type: "json",
      data: [1, "two", null, true],
    };

    const buffer = generateJson(content);
    const parsed = JSON.parse(buffer.toString("utf-8"));
    assert.deepEqual(parsed, [1, "two", null, true]);
  });

  it("handles null data", () => {
    const content: JsonContent = {
      type: "json",
      data: null,
    };

    const buffer = generateJson(content);
    const text = buffer.toString("utf-8");
    assert.equal(text, "null");
  });
});
