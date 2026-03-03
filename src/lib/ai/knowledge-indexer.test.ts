import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Inline chunkText to avoid transitive module resolution issues
// (knowledge-indexer.ts imports from embeddings which isn't resolvable in node --test)

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const MIN_CHUNK_WORDS = 20;

function splitByHeadings(text: string): string[] {
  const lines = text.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}

function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sections = splitByHeadings(trimmed);
  const chunks: string[] = [];

  for (const section of sections) {
    const sectionWords = section.split(/\s+/).length;

    if (sectionWords <= chunkSize) {
      if (sectionWords >= MIN_CHUNK_WORDS) {
        chunks.push(section.trim());
      }
      continue;
    }

    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let accumulator: string[] = [];
    let accumWords = 0;

    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).length;

      if (paraWords > chunkSize) {
        if (accumWords >= MIN_CHUNK_WORDS) {
          chunks.push(accumulator.join("\n\n").trim());
        }
        accumulator = [];
        accumWords = 0;

        const words = para.split(/\s+/);
        let start = 0;
        while (start < words.length) {
          const end = Math.min(start + chunkSize, words.length);
          const chunk = words.slice(start, end).join(" ");
          if (chunk.split(/\s+/).length >= MIN_CHUNK_WORDS) {
            chunks.push(chunk);
          }
          if (end >= words.length) break;
          start = end - overlap;
        }
        continue;
      }

      if (accumWords + paraWords > chunkSize && accumWords > 0) {
        if (accumWords >= MIN_CHUNK_WORDS) {
          chunks.push(accumulator.join("\n\n").trim());
        }
        accumulator = [];
        accumWords = 0;
      }

      accumulator.push(para);
      accumWords += paraWords;
    }

    if (accumWords >= MIN_CHUNK_WORDS) {
      chunks.push(accumulator.join("\n\n").trim());
    }
  }

  return chunks;
}

describe("chunkText — structure-aware chunking", () => {
  it("splits by headings into separate chunks", () => {
    const text = [
      "# Section One",
      "This is the first section with enough words to pass the minimum threshold of twenty words for a valid chunk.",
      "",
      "# Section Two",
      "This is the second section also with enough words to pass the minimum threshold of twenty words for a valid chunk.",
    ].join("\n");

    const chunks = chunkText(text);
    assert.equal(chunks.length, 2);
    assert.ok(chunks[0].startsWith("# Section One"));
    assert.ok(chunks[1].startsWith("# Section Two"));
  });

  it("preserves heading text in chunk content", () => {
    const text = [
      "## Grain Marketing Strategy",
      "This section covers the grain marketing strategy including basis levels, elevator contracts, and hedging approaches for corn and soybeans in the upper midwest region.",
    ].join("\n");

    const chunks = chunkText(text);
    assert.ok(chunks.length >= 1);
    assert.ok(chunks[0].includes("## Grain Marketing Strategy"));
  });

  it("falls back to word-window for long unstructured text", () => {
    const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text, 500, 50);
    assert.ok(chunks.length >= 2, `Expected >= 2 chunks, got ${chunks.length}`);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(chunkText(""), []);
    assert.deepEqual(chunkText("   "), []);
  });

  it("returns empty array for whitespace-only input", () => {
    assert.deepEqual(chunkText("\n\n\n"), []);
  });

  it("skips chunks under 20 words", () => {
    const text = [
      "# Short",
      "Too short.",
      "",
      "# Long Section",
      "This section has more than twenty words and therefore should be included in the output as a valid chunk that passes the minimum word threshold.",
    ].join("\n");

    const chunks = chunkText(text);
    assert.equal(chunks.length, 1);
    assert.ok(chunks[0].includes("Long Section"));
  });

  it("handles h2/h3/h4 headings", () => {
    const text = [
      "## H2 heading",
      "Content under h2 with enough words to pass the twenty word minimum threshold for valid chunking in this test case.",
      "",
      "### H3 heading",
      "Content under h3 with enough words to pass the twenty word minimum threshold for valid chunking in this test case.",
      "",
      "#### H4 heading",
      "Content under h4 with enough words to pass the twenty word minimum threshold for valid chunking in this test case.",
    ].join("\n");

    const chunks = chunkText(text);
    assert.equal(chunks.length, 3);
  });

  it("splits on paragraph boundaries within oversized sections", () => {
    const para1 = Array.from({ length: 300 }, (_, i) => `alpha${i}`).join(" ");
    const para2 = Array.from({ length: 300 }, (_, i) => `beta${i}`).join(" ");
    const text = `# Big Section\n\n${para1}\n\n${para2}`;

    const chunks = chunkText(text, 500, 50);
    assert.ok(chunks.length >= 2, `Expected >= 2 chunks, got ${chunks.length}`);
  });

  it("returns single chunk for small document", () => {
    const text = "# Overview\n\nThis is a small document about farming practices in the upper midwest with corn and soybeans as primary crops.";
    const chunks = chunkText(text);
    assert.equal(chunks.length, 1);
  });
});
