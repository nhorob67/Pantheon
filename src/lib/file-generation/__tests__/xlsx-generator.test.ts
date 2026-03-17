import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateXlsx } from "../xlsx-generator.ts";
import type { TabularContent } from "../../../../types/file-creation.ts";

describe("generateXlsx", () => {
  it("generates a valid xlsx buffer", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Name", "Score"],
      rows: [
        ["Alice", 95],
        ["Bob", 87],
      ],
    };

    const buffer = await generateXlsx(content);

    // XLSX files start with PK (ZIP format magic bytes)
    assert.ok(buffer.length > 0);
    assert.equal(buffer[0], 0x50); // P
    assert.equal(buffer[1], 0x4b); // K
  });

  it("accepts a custom sheet name", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["A"],
      rows: [["B"]],
      sheetName: "MySheet",
    };

    const buffer = await generateXlsx(content);
    assert.ok(buffer.length > 0);
  });

  it("handles empty rows", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Col1"],
      rows: [],
    };

    const buffer = await generateXlsx(content);
    assert.ok(buffer.length > 0);
  });

  it("handles null values in rows", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["A", "B"],
      rows: [[null, "value"]],
    };

    const buffer = await generateXlsx(content);
    assert.ok(buffer.length > 0);
  });
});
