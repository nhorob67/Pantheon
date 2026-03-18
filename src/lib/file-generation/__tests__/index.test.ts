import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveContent, generateFile } from "../index.ts";
import type { FileCreateToolInput, TabularContent, DocumentContent, JsonContent } from "../../../types/file-creation.ts";

describe("resolveContent", () => {
  it("resolves CSV input to tabular content", () => {
    const input: FileCreateToolInput = {
      format: "csv",
      filename: "test.csv",
      headers: ["A", "B"],
      rows: [["1", "2"]],
    };

    const content = resolveContent(input);
    assert.equal(content.type, "tabular");
    assert.deepEqual((content as TabularContent).headers, ["A", "B"]);
  });

  it("resolves XLSX input to tabular content with sheet name", () => {
    const input: FileCreateToolInput = {
      format: "xlsx",
      filename: "test.xlsx",
      headers: ["X"],
      rows: [["Y"]],
      sheet_name: "Data",
    };

    const content = resolveContent(input);
    assert.equal(content.type, "tabular");
    assert.equal((content as TabularContent).sheetName, "Data");
  });

  it("resolves JSON input to json content", () => {
    const input: FileCreateToolInput = {
      format: "json",
      filename: "data.json",
      data: { key: "value" },
    };

    const content = resolveContent(input);
    assert.equal(content.type, "json");
    assert.deepEqual((content as JsonContent).data, { key: "value" });
  });

  it("resolves PDF input to document content", () => {
    const input: FileCreateToolInput = {
      format: "pdf",
      filename: "doc.pdf",
      title: "Report",
      sections: [{ heading: "Intro", body: "Text" }],
    };

    const content = resolveContent(input);
    assert.equal(content.type, "document");
    assert.equal((content as DocumentContent).title, "Report");
  });

  it("resolves TXT input to document content", () => {
    const input: FileCreateToolInput = {
      format: "txt",
      filename: "notes.txt",
      sections: [{ body: "Note content" }],
    };

    const content = resolveContent(input);
    assert.equal(content.type, "document");
  });
});

describe("generateFile", () => {
  it("generates CSV file with correct content type", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["Col"],
      rows: [["Val"]],
    };

    const result = await generateFile("csv", content, "test");
    assert.equal(result.contentType, "text/csv");
    assert.equal(result.filename, "test.csv");
    assert.ok(result.sizeBytes > 0);
    assert.ok(result.buffer.toString("utf-8").includes("Col"));
  });

  it("generates JSON file with correct content type", async () => {
    const content: JsonContent = {
      type: "json",
      data: [1, 2, 3],
    };

    const result = await generateFile("json", content, "data");
    assert.equal(result.contentType, "application/json");
    assert.equal(result.filename, "data.json");
  });

  it("generates PDF file with correct content type", async () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Hello" }],
    };

    const result = await generateFile("pdf", content, "doc");
    assert.equal(result.contentType, "application/pdf");
    assert.equal(result.filename, "doc.pdf");
    assert.ok(result.buffer.subarray(0, 4).toString("ascii").startsWith("%PDF"));
  });

  it("generates XLSX file with correct content type", async () => {
    const content: TabularContent = {
      type: "tabular",
      headers: ["A"],
      rows: [["B"]],
    };

    const result = await generateFile("xlsx", content, "sheet");
    assert.equal(result.contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(result.filename, "sheet.xlsx");
  });

  it("generates HTML file with correct content type", async () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Content" }],
    };

    const result = await generateFile("html", content, "page");
    assert.equal(result.contentType, "text/html");
    assert.ok(result.buffer.toString("utf-8").includes("<!DOCTYPE html>"));
  });

  it("generates MD file with correct content type", async () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Markdown content" }],
    };

    const result = await generateFile("md", content, "readme");
    assert.equal(result.contentType, "text/markdown");
    assert.equal(result.filename, "readme.md");
  });

  it("generates TXT file with correct content type", async () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Plain text" }],
    };

    const result = await generateFile("txt", content, "notes");
    assert.equal(result.contentType, "text/plain");
    assert.equal(result.filename, "notes.txt");
  });
});
