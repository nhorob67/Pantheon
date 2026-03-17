import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeFilename } from "../sanitize.ts";

describe("sanitizeFilename", () => {
  it("preserves valid filenames and adds extension", () => {
    assert.equal(sanitizeFilename("report", ".csv"), "report.csv");
  });

  it("normalizes existing extension", () => {
    assert.equal(sanitizeFilename("data.csv", ".csv"), "data.csv");
  });

  it("strips path traversal components", () => {
    // Path components before last separator are stripped, dots removed from start
    assert.equal(sanitizeFilename("../../etc/passwd", ".txt"), "passwd.txt");
  });

  it("strips backslash path components", () => {
    assert.equal(sanitizeFilename("C:\\Users\\file", ".xlsx"), "file.xlsx");
  });

  it("replaces unsafe characters with underscores", () => {
    assert.equal(sanitizeFilename('file<>:"|?*name', ".pdf"), "file_______name.pdf");
  });

  it("collapses consecutive dots", () => {
    assert.equal(sanitizeFilename("file...name", ".txt"), "file.name.txt");
  });

  it("handles empty string", () => {
    assert.equal(sanitizeFilename("", ".csv"), "file.csv");
  });

  it("handles filename that is just the extension", () => {
    // Leading dot stripped, leaves "csv" which doesn't match extension exactly
    assert.equal(sanitizeFilename(".csv", ".csv"), "csv.csv");
  });

  it("truncates long filenames", () => {
    const longName = "a".repeat(300);
    const result = sanitizeFilename(longName, ".csv");
    assert.ok(result.length <= 255);
    assert.ok(result.endsWith(".csv"));
  });

  it("is case-insensitive for extension matching", () => {
    assert.equal(sanitizeFilename("report.CSV", ".csv"), "report.csv");
  });
});
