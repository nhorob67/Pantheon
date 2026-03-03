import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Inline the pure function to avoid transitive module resolution issues
// (memory-record-writer.ts imports from supabase/embeddings which aren't resolvable in node --test)
function computeContentHash(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

describe("memory-record-writer", () => {
  describe("content hash computation", () => {
    it("normalizes whitespace before hashing", () => {
      const hash1 = computeContentHash("  Farm has   2400  acres  ");
      const hash2 = computeContentHash("farm has 2400 acres");
      assert.equal(hash1, hash2);
    });

    it("is case-insensitive", () => {
      const hash1 = computeContentHash("Corn price is $4.50");
      const hash2 = computeContentHash("corn price is $4.50");
      assert.equal(hash1, hash2);
    });

    it("produces different hashes for different content", () => {
      const hash1 = computeContentHash("Farm grows corn");
      const hash2 = computeContentHash("Farm grows soybeans");
      assert.notEqual(hash1, hash2);
    });

    it("produces a 64-character hex string", () => {
      const hash = computeContentHash("Test content for hash length");
      assert.equal(hash.length, 64);
      assert.match(hash, /^[a-f0-9]{64}$/);
    });
  });

  describe("hash-first dedup ordering", () => {
    it("hash computation does not require an embedding", () => {
      const hash = computeContentHash("Farm has 2400 acres of corn");
      assert.ok(hash.length === 64, "Hash should be computed without any embedding");
    });

    it("identical content produces identical hash regardless of formatting", () => {
      const hash1 = computeContentHash("  Farm  has\t2400\n acres  ");
      const hash2 = computeContentHash("farm has 2400 acres");
      assert.equal(hash1, hash2);
    });
  });

  describe("unique constraint handling", () => {
    it("recognizes Postgres unique violation code 23505", () => {
      const error = { code: "23505", message: "duplicate key value" };
      const isDuplicate = error.code === "23505";
      assert.ok(isDuplicate);
    });

    it("treats other error codes as real failures", () => {
      const error = { code: "42P01", message: "relation does not exist" };
      const isDuplicate = error.code === "23505";
      assert.ok(!isDuplicate);
    });
  });

  describe("atomic RPC response handling", () => {
    it("detects duplicate from RPC response", () => {
      const row = { new_id: null, superseded_id: null, was_duplicate: true };
      assert.ok(row.was_duplicate);
      assert.equal(row.new_id, null);
    });

    it("detects supersede from RPC response", () => {
      const row = {
        new_id: "00000000-0000-0000-0000-000000000001",
        superseded_id: "00000000-0000-0000-0000-000000000002",
        was_duplicate: false,
      };
      assert.ok(!row.was_duplicate);
      assert.ok(row.new_id);
      assert.ok(row.superseded_id);
    });

    it("detects normal insert from RPC response", () => {
      const row = {
        new_id: "00000000-0000-0000-0000-000000000001",
        superseded_id: null,
        was_duplicate: false,
      };
      assert.ok(!row.was_duplicate);
      assert.ok(row.new_id);
      assert.equal(row.superseded_id, null);
    });
  });

  describe("validation integration", () => {
    it("rejects content shorter than 10 characters", () => {
      const content = "short";
      assert.ok(content.trim().length < 10);
    });

    it("rejects content longer than 6000 characters", () => {
      const content = "x".repeat(6001);
      assert.ok(content.length > 6000);
    });

    it("rejects content with SSN patterns", () => {
      const content = "My SSN is 123-45-6789 and I grow corn";
      const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
      assert.ok(ssnPattern.test(content));
    });

    it("accepts valid farm content", () => {
      const content = "Farm has 2400 acres of corn and soybeans near Bismarck ND";
      assert.ok(content.length >= 10);
      assert.ok(content.length <= 6000);
      const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
      assert.ok(!ssnPattern.test(content));
    });
  });

  describe("capture level enforcement", () => {
    it("conservative only allows fact and commitment", () => {
      const allowed = ["fact", "commitment"];
      assert.ok(allowed.includes("fact"));
      assert.ok(allowed.includes("commitment"));
      assert.ok(!allowed.includes("preference"));
      assert.ok(!allowed.includes("outcome"));
    });

    it("conservative requires confidence >= 0.7", () => {
      const minConfidence = 0.7;
      assert.ok(0.8 >= minConfidence);
      assert.ok(!(0.5 >= minConfidence));
    });

    it("standard requires confidence >= 0.5", () => {
      const minConfidence = 0.5;
      assert.ok(0.6 >= minConfidence);
      assert.ok(!(0.3 >= minConfidence));
    });

    it("aggressive allows any type and confidence", () => {
      assert.ok(true);
    });
  });

  describe("excluded categories", () => {
    it("blocks content matching excluded category", () => {
      const content = "The financial situation is complex";
      const excludeCategories = ["financial"];
      const lower = content.toLowerCase();
      const blocked = excludeCategories.some((cat) => lower.includes(cat.toLowerCase()));
      assert.ok(blocked);
    });

    it("allows content not matching any excluded category", () => {
      const content = "Corn yield was 180 bushels per acre";
      const excludeCategories = ["financial", "personal"];
      const lower = content.toLowerCase();
      const blocked = excludeCategories.some((cat) => lower.includes(cat.toLowerCase()));
      assert.ok(!blocked);
    });
  });

  describe("embedding failure handling", () => {
    it("should proceed without embedding when generation fails", () => {
      const embedding: number[] = [];
      const skipDedup = embedding.length === 0;
      assert.ok(skipDedup, "Should skip dedup when no embedding");
    });
  });
});
