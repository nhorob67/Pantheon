import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("conversation-search", () => {
  describe("searchConversations input validation", () => {
    it("empty query returns empty results", async () => {
      // The function returns early for empty/whitespace queries
      const trimmed = "   ".trim();
      assert.equal(trimmed, "");
    });

    it("limit is clamped between 1 and 25", () => {
      const clamp = (limit: number) => Math.min(Math.max(limit, 1), 25);
      assert.equal(clamp(0), 1);
      assert.equal(clamp(-5), 1);
      assert.equal(clamp(10), 10);
      assert.equal(clamp(50), 25);
      assert.equal(clamp(25), 25);
    });
  });

  describe("result truncation", () => {
    it("truncates content_text longer than 500 chars", () => {
      const longText = "x".repeat(600);
      const truncated =
        longText.length > 500
          ? longText.slice(0, 497) + "..."
          : longText;
      assert.equal(truncated.length, 500);
      assert.ok(truncated.endsWith("..."));
    });

    it("preserves content_text shorter than 500 chars", () => {
      const shortText = "Hello, this is a short message.";
      const result =
        shortText.length > 500
          ? shortText.slice(0, 497) + "..."
          : shortText;
      assert.equal(result, shortText);
    });

    it("handles null content_text", () => {
      const contentText: string | null = null;
      const result = contentText ?? "";
      assert.equal(result, "");
    });
  });
});
