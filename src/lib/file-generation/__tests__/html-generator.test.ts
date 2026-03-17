import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateHtml } from "../html-generator.ts";
import type { DocumentContent } from "../../../../types/file-creation.ts";

describe("generateHtml", () => {
  it("generates valid HTML document structure", () => {
    const content: DocumentContent = {
      type: "document",
      title: "Report",
      sections: [
        { heading: "Intro", body: "Hello world." },
      ],
    };

    const buffer = generateHtml(content);
    const html = buffer.toString("utf-8");

    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("<title>Report</title>"));
    assert.ok(html.includes("<h1>Report</h1>"));
    assert.ok(html.includes("<h2>Intro</h2>"));
    assert.ok(html.includes("<p>Hello world.</p>"));
  });

  it("escapes HTML special characters", () => {
    const content: DocumentContent = {
      type: "document",
      sections: [
        { body: '<script>alert("xss")</script>' },
      ],
    };

    const buffer = generateHtml(content);
    const html = buffer.toString("utf-8");

    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("splits paragraphs on double newlines", () => {
    const content: DocumentContent = {
      type: "document",
      sections: [
        { body: "Paragraph 1\n\nParagraph 2" },
      ],
    };

    const buffer = generateHtml(content);
    const html = buffer.toString("utf-8");

    assert.ok(html.includes("<p>Paragraph 1</p>"));
    assert.ok(html.includes("<p>Paragraph 2</p>"));
  });
});
