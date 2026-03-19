import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Conversation search tool tests.
 *
 * Tests the tool's output contract and behavior through a simulated execute function
 * that matches the real implementation's logic without importing the `ai` SDK.
 */

function truncateContent(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

interface MockMessage {
  id: string;
  direction: string;
  content_text: string | null;
  created_at: string;
}

/** Simulate the conversation_search execute logic without the `ai` SDK dependency */
async function simulateConversationSearch(
  mockMessages: MockMessage[],
  query: string,
  limit: number = 10,
  direction: "inbound" | "outbound" | "all" = "all",
  shouldError: boolean = false
): Promise<Record<string, unknown>> {
  if (shouldError) {
    return { error: "Search failed: Database connection failed" };
  }

  // Simulate ilike filter
  const filtered = mockMessages.filter((m) => {
    if (!m.content_text) return false;
    if (!m.content_text.toLowerCase().includes(query.toLowerCase())) return false;
    if (direction !== "all" && m.direction !== direction) return false;
    return true;
  });

  const results = filtered.slice(0, limit);

  if (results.length === 0) {
    return { messages: [], count: 0, query };
  }

  return {
    messages: results.map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: truncateContent(m.content_text ?? "", 500),
      timestamp: m.created_at,
    })),
    count: results.length,
    query,
  };
}

describe("conversation_search tool contract", () => {
  it("returns formatted messages on success", async () => {
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: "What is the project status?", created_at: "2026-03-17T10:00:00Z" },
      { id: "m2", direction: "outbound", content_text: "The project is on track.", created_at: "2026-03-17T10:01:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "project");

    assert.ok("messages" in result, "Should return messages");
    const typed = result as { messages: Array<{ role: string; content: string; timestamp: string }>; count: number };
    assert.equal(typed.count, 2);
    assert.equal(typed.messages[0].role, "user");
    assert.equal(typed.messages[1].role, "assistant");
  });

  it("returns empty array when no matches", async () => {
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: "Hello world", created_at: "2026-03-17T10:00:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "nonexistent topic");

    const typed = result as { messages: unknown[]; count: number };
    assert.equal(typed.count, 0);
    assert.equal(typed.messages.length, 0);
  });

  it("returns error on database failure", async () => {
    const result = await simulateConversationSearch([], "test query", 10, "all", true);

    assert.ok("error" in result, "Should return error");
    const typed = result as { error: string };
    assert.ok(typed.error.includes("Search failed"), "Error message should describe failure");
  });

  it("truncates long message content", async () => {
    const longContent = "A".repeat(1000);
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: longContent, created_at: "2026-03-17T10:00:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "A");

    const typed = result as { messages: Array<{ content: string }> };
    assert.ok(typed.messages[0].content.length <= 500, "Content should be truncated to 500 chars");
    assert.ok(typed.messages[0].content.endsWith("..."), "Truncated content should end with ...");
  });

  it("filters by direction when specified", async () => {
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: "User message about topic", created_at: "2026-03-17T10:00:00Z" },
      { id: "m2", direction: "outbound", content_text: "Assistant response about topic", created_at: "2026-03-17T10:01:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "topic", 10, "inbound");

    const typed = result as { messages: Array<{ role: string }>; count: number };
    assert.equal(typed.count, 1);
    assert.equal(typed.messages[0].role, "user");
  });

  it("respects limit parameter", async () => {
    const mockMessages: MockMessage[] = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      direction: "inbound",
      content_text: `Message ${i} about project updates`,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    }));

    const result = await simulateConversationSearch(mockMessages, "project", 5);

    const typed = result as { messages: unknown[]; count: number };
    assert.equal(typed.count, 5);
  });

  it("handles messages with null content_text", async () => {
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: null, created_at: "2026-03-17T10:00:00Z" },
      { id: "m2", direction: "inbound", content_text: "Real message about topic", created_at: "2026-03-17T10:01:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "topic");

    const typed = result as { messages: unknown[]; count: number };
    assert.equal(typed.count, 1, "Should skip null content messages");
  });

  it("search is case-insensitive", async () => {
    const mockMessages: MockMessage[] = [
      { id: "m1", direction: "inbound", content_text: "The Acme Corp project is progressing well.", created_at: "2026-03-17T10:00:00Z" },
    ];

    const result = await simulateConversationSearch(mockMessages, "acme corp");

    const typed = result as { count: number };
    assert.equal(typed.count, 1, "Search should be case-insensitive");
  });
});

describe("truncateContent helper", () => {
  it("does not truncate short strings", () => {
    assert.equal(truncateContent("hello", 500), "hello");
  });

  it("truncates long strings with ellipsis", () => {
    const long = "x".repeat(600);
    const result = truncateContent(long, 500);
    assert.equal(result.length, 500);
    assert.ok(result.endsWith("..."));
  });

  it("handles exact boundary", () => {
    const exact = "x".repeat(500);
    assert.equal(truncateContent(exact, 500), exact);
  });
});
