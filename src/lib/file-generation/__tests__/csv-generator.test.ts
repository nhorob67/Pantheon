import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateCsv } from "../csv-generator.ts";
import type { TabularContent } from "../../../types/file-creation.ts";

describe("generateCsv", () => {
  it("generates valid CSV with headers and rows", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Name", "Age", "City"],
      rows: [
        ["Alice", 30, "New York"],
        ["Bob", 25, "London"],
      ],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes("Name,Age,City"));
    assert.ok(text.includes("Alice,30,New York"));
    assert.ok(text.includes("Bob,25,London"));
  });

  it("escapes fields containing commas", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Name"],
      rows: [["Smith, John"]],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes('"Smith, John"'));
  });

  it("escapes fields containing double quotes", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Quote"],
      rows: [['He said "hello"']],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes('"He said ""hello"""'));
  });

  it("escapes fields containing newlines", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Text"],
      rows: [["line1\nline2"]],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes('"line1\nline2"'));
  });

  it("handles null values as empty strings", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["A", "B"],
      rows: [[null, "value"]],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes(",value"));
  });

  it("handles boolean values", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Active"],
      rows: [[true], [false]],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes("true"));
    assert.ok(text.includes("false"));
  });

  it("handles empty rows", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["A"],
      rows: [],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.equal(text, "A\r\n");
  });

  it("handles unicode characters", () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Name"],
      rows: [["日本語"], ["émoji 🎉"]],
    };

    const buffer = generateCsv(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes("日本語"));
    assert.ok(text.includes("émoji 🎉"));
  });
});
