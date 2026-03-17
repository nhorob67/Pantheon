import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePdf } from "../pdf-generator.ts";
import type { DocumentContent } from "../../../../types/file-creation.ts";

describe("generatePdf", () => {
  it("generates a valid PDF buffer with magic bytes", async () => {
    const content: DocumentContent = {
      type: "document",
      title: "Test Report",
      sections: [
        { heading: "Introduction", body: "This is a test document." },
      ],
    };

    const buffer = await generatePdf(content);

    assert.ok(buffer.length > 0);
    // PDF files start with %PDF
    const header = buffer.subarray(0, 5).toString("ascii");
    assert.ok(header.startsWith("%PDF"), `Expected PDF header, got: ${header}`);
  });

  it("generates PDF without title", async () => {
    const content: DocumentContent = {
      type: "document",
      sections: [{ body: "Just text." }],
    };

    const buffer = await generatePdf(content);
    assert.ok(buffer.length > 0);
  });

  it("generates PDF with multiple sections", async () => {
    const content: DocumentContent = {
      type: "document",
      title: "Multi-Section",
      sections: [
        { heading: "Section 1", body: "First section content." },
        { heading: "Section 2", body: "Second section content." },
        { body: "Section without heading." },
      ],
    };

    const buffer = await generatePdf(content);
    assert.ok(buffer.length > 0);
  });
});
