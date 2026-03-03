import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyMemoryTier } from "./memory-tier-classifier.ts";

describe("classifyMemoryTier", () => {
  it("classifies outcome type as working", () => {
    assert.equal(classifyMemoryTier("outcome", 0.95, "Corn was delivered successfully to CHS"), "working");
  });

  it("classifies summary type as working", () => {
    assert.equal(classifyMemoryTier("summary", 0.9, "Session summary of today's conversation"), "working");
  });

  it("classifies other type as working", () => {
    assert.equal(classifyMemoryTier("other", 0.9, "Some miscellaneous information here"), "working");
  });

  it("classifies low confidence as working regardless of type", () => {
    assert.equal(classifyMemoryTier("fact", 0.3, "The farmer mentioned something about corn"), "working");
    assert.equal(classifyMemoryTier("preference", 0.49, "Prefers to sell at CHS"), "working");
  });

  it("classifies short content as working regardless of confidence", () => {
    assert.equal(classifyMemoryTier("fact", 0.95, "corn"), "working");
    assert.equal(classifyMemoryTier("fact", 1.0, "short text here"), "working");
  });

  it("classifies high-confidence fact as knowledge", () => {
    assert.equal(classifyMemoryTier("fact", 0.85, "Farm has 2400 acres of corn near Minot, ND"), "knowledge");
    assert.equal(classifyMemoryTier("fact", 1.0, "Always delivers corn to CHS Minot elevator"), "knowledge");
  });

  it("classifies high-confidence preference as knowledge", () => {
    assert.equal(classifyMemoryTier("preference", 0.9, "Prefers to sell corn at CHS Minot rather than ADM"), "knowledge");
    assert.equal(classifyMemoryTier("preference", 1.0, "Likes morning weather briefings at 6am central"), "knowledge");
  });

  it("classifies medium-confidence fact as episodic", () => {
    assert.equal(classifyMemoryTier("fact", 0.7, "Mentioned planting corn in the south quarter this year"), "episodic");
    assert.equal(classifyMemoryTier("fact", 0.84, "Said they might switch to soybeans next year"), "episodic");
  });

  it("classifies medium-confidence preference as episodic", () => {
    assert.equal(classifyMemoryTier("preference", 0.8, "Seemed to prefer shorter weather reports"), "episodic");
    assert.equal(classifyMemoryTier("preference", 0.89, "Likes grain bid updates in the morning"), "episodic");
  });

  it("classifies commitment as episodic at any valid confidence", () => {
    assert.equal(classifyMemoryTier("commitment", 0.95, "Plans to deliver 500 bushels of corn on Thursday"), "episodic");
    assert.equal(classifyMemoryTier("commitment", 0.5, "Might spray the north field next week"), "episodic");
  });

  it("handles boundary values", () => {
    // confidence exactly 0.5 — not < 0.5, so not forced to working
    assert.equal(classifyMemoryTier("commitment", 0.5, "Will check grain bids tomorrow morning"), "episodic");
    // content exactly 20 chars after trim
    assert.equal(classifyMemoryTier("fact", 0.9, "12345678901234567890"), "knowledge");
    // content 19 chars — too short
    assert.equal(classifyMemoryTier("fact", 0.9, "1234567890123456789"), "working");
  });

  it("trims whitespace before checking length", () => {
    assert.equal(classifyMemoryTier("fact", 0.9, "   short   "), "working");
    assert.equal(classifyMemoryTier("fact", 0.9, "   This is a long enough content string   "), "knowledge");
  });
});
