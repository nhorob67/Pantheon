import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateDeterministicSummary } from "../deterministic-compaction.ts";

const NOW = new Date("2026-03-17T12:00:00Z");
function minutesAgo(mins: number): string {
  return new Date(NOW.getTime() - mins * 60_000).toISOString();
}

describe("generateDeterministicSummary", () => {
  it("returns a summary with message counts for basic conversation", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "Can you check the status of the Acme Corp project deliverables?", created_at: minutesAgo(10) },
      { direction: "outbound" as const, content_text: "The Acme Corp project has 5 deliverables pending review as of today.", created_at: minutesAgo(9) },
      { direction: "inbound" as const, content_text: "Great, I will submit the final report by Thursday.", created_at: minutesAgo(8) },
      { direction: "outbound" as const, content_text: "Understood. I'll remind you on Wednesday evening.", created_at: minutesAgo(7) },
    ];

    const result = generateDeterministicSummary(messages);

    assert.ok(result.summary.length > 0, "Summary should not be empty");
    assert.ok(result.summary.includes("2 user messages"), "Should count user messages");
    assert.ok(result.summary.includes("2 assistant messages"), "Should count assistant messages");
  });

  it("extracts commitments from user messages", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "I will finish the quarterly report by end of week and send it to the client.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "Sounds good, I'll track that for you.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);

    const commitments = result.facts.filter((f) => f.type === "commitment");
    assert.ok(commitments.length > 0, "Should extract at least one commitment");
    assert.ok(
      commitments.some((c) => c.content.toLowerCase().includes("quarterly report")),
      "Commitment should mention quarterly report"
    );
  });

  it("extracts preferences from user messages", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "I prefer receiving updates in the morning before standup.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "Noted, I'll schedule updates for morning delivery.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);

    const preferences = result.facts.filter((f) => f.type === "preference");
    assert.ok(preferences.length > 0, "Should extract at least one preference");
  });

  it("extracts numeric facts", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "Our team has 15 projects active this quarter.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "That's a 25% increase from last quarter.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);

    const facts = result.facts.filter((f) => f.type === "fact");
    assert.ok(facts.length > 0, "Should extract numeric facts");
  });

  it("handles empty messages gracefully", () => {
    const result = generateDeterministicSummary([]);
    assert.equal(result.summary, "No messages to summarize.");
    assert.equal(result.facts.length, 0);
  });

  it("limits facts to maximum of 5", () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      direction: "inbound" as const,
      content_text: `I will complete task number ${i + 1} by next Monday for the big client.`,
      created_at: minutesAgo(10 - i),
    }));

    const result = generateDeterministicSummary(messages);
    assert.ok(result.facts.length <= 5, `Should have at most 5 facts, got ${result.facts.length}`);
  });

  it("extracts named entities", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "We need to coordinate with Acme Corp and Globex Partners on the joint venture.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "I'll draft the coordination plan for both entities.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);
    assert.ok(
      result.summary.includes("Acme Corp") || result.summary.includes("Globex Partners"),
      "Summary should mention named entities"
    );
  });

  it("includes temporal markers when present", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "The Q1 2026 review showed strong performance across all departments.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "That's great news for the upcoming quarter.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);
    assert.ok(
      result.summary.includes("Q1 2026") || result.summary.includes("Time references"),
      "Summary should capture temporal markers"
    );
  });

  it("deduplicates similar topic sentences", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "Can you check the project status for the engineering team?", created_at: minutesAgo(5) },
      { direction: "inbound" as const, content_text: "Can you check the project status for the engineering team again?", created_at: minutesAgo(3) },
      { direction: "outbound" as const, content_text: "Here is the latest status update.", created_at: minutesAgo(2) },
    ];

    const result = generateDeterministicSummary(messages);
    // Should not have two nearly-identical topic sentences
    const topicMatches = (result.summary.match(/check the project status/g) || []).length;
    assert.ok(topicMatches <= 1, "Should deduplicate similar topic sentences");
  });

  it("all facts have confidence values between 0 and 1", () => {
    const messages = [
      { direction: "inbound" as const, content_text: "I prefer daily updates at 9am. I will complete the migration by Friday.", created_at: minutesAgo(5) },
      { direction: "outbound" as const, content_text: "The project has 42 tasks remaining and we're at 85% completion.", created_at: minutesAgo(4) },
    ];

    const result = generateDeterministicSummary(messages);
    for (const fact of result.facts) {
      assert.ok(fact.confidence >= 0 && fact.confidence <= 1, `Confidence ${fact.confidence} out of range`);
    }
  });
});
