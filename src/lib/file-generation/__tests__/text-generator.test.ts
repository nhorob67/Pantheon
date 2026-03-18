import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateText } from "../text-generator.ts";
import type { DocumentContent } from "../../../types/file-creation.ts";

describe("generateText", () => {
  it("generates text with title and sections", () => {
    const content: DocumentContent = {
      type: "document",
      title: "My Report",
      sections: [
        { heading: "Summary", body: "This is a summary." },
      ],
    };

    const buffer = generateText(content);
    const text = buffer.toString("utf-8");

    assert.ok(text.includes("My Report"));
    assert.ok(text.includes("Summary"));
    assert.ok(text.includes("This is a summary."));
  });

  it("generates text without title", () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Just content." }],
    };

    const buffer = generateText(content);
    const text = buffer.toString("utf-8");
    assert.ok(text.includes("Just content."));
  });

  it("generates text with headings using underlines", () => {
    const content: DocumentContent = {
      type: "document",
      title: "Title",
      sections: [{ heading: "Heading", body: "Body" }],
    };

    const buffer = generateText(content);
    const text = buffer.toString("utf-8");

    // Title should have = underline
    assert.ok(text.includes("====="));
    // Heading should have - underline
    assert.ok(text.includes("-------"));
  });
});
