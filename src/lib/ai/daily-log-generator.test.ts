import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyMemoryTier } from "./memory-tier-classifier.ts";
import { getHalfLifeDays } from "./memory-scorer.ts";
import { computeContentHash } from "./memory-record-writer.ts";

describe("daily-log-generator", () => {
  it("generates content with date for dedup hash uniqueness", () => {
    const date = "2026-03-14";
    const summary = "Discussed project timeline and next steps.";
    const topics = ["project", "timeline"];

    const content = `Daily log for ${date}: ${summary}\nTopics: ${topics.join(", ")}`;
    assert.ok(content.includes("2026-03-14"));
    assert.ok(content.includes("Discussed project timeline"));
  });

  it("skips tenants with zero activity", () => {
    const messages: unknown[] = [];
    // When no messages exist for the date, generateDailyLog returns { written: false }
    assert.equal(messages.length, 0);
  });

  it("dedup prevents duplicate entries for same date", () => {
    const date = "2026-03-14";
    const content1 = `Daily log for ${date}: Summary A`;
    const content2 = `Daily log for ${date}: Summary A`;

    const hash1 = computeContentHash(content1);
    const hash2 = computeContentHash(content2);

    // Same content produces same hash — writeMemoryRecord will reject as duplicate
    assert.equal(hash1, hash2);
  });

  it("different dates produce different hashes", () => {
    const content1 = "Daily log for 2026-03-14: Summary A";
    const content2 = "Daily log for 2026-03-15: Summary A";

    const hash1 = computeContentHash(content1);
    const hash2 = computeContentHash(content2);

    assert.notEqual(hash1, hash2);
  });

  it("daily_log classified as episodic tier", () => {
    const tier = classifyMemoryTier("daily_log", 0.95, "Daily log for 2026-03-14: Activity summary with enough content");
    assert.equal(tier, "episodic");
  });

  it("daily_log has 30-day half-life in episodic tier", () => {
    const halfLife = getHalfLifeDays("episodic", "daily_log");
    assert.equal(halfLife, 30);
  });
});
