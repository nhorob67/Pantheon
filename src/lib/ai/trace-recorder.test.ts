import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractBrowserSessions, extractWebCitations } from "./trace-recorder.ts";

describe("extractWebCitations", () => {
  it("extracts citations from web_search results", () => {
    const records = [
      {
        toolName: "web_search",
        success: true,
        outputSummary: JSON.stringify({
          results: [
            { url: "https://example.com/a", title: "Page A", snippet: "Snippet A" },
            { url: "https://example.com/b", title: "Page B", snippet: "Snippet B" },
          ],
          fetched_at: "2026-03-16T00:00:00Z",
        }),
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 2);
    assert.equal(citations[0].url, "https://example.com/a");
    assert.equal(citations[0].title, "Page A");
    assert.equal(citations[0].tool, "web_search");
    assert.equal(citations[1].url, "https://example.com/b");
  });

  it("extracts citations from web_fetch results", () => {
    const records = [
      {
        toolName: "web_fetch",
        success: true,
        outputSummary: JSON.stringify({
          url: "https://example.com/page",
          title: "Fetched Page",
          description: "A description",
          fetched_at: "2026-03-16T00:00:00Z",
        }),
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 1);
    assert.equal(citations[0].url, "https://example.com/page");
    assert.equal(citations[0].title, "Fetched Page");
    assert.equal(citations[0].snippet, "A description");
    assert.equal(citations[0].tool, "web_fetch");
  });

  it("deduplicates URLs across search and fetch", () => {
    const records = [
      {
        toolName: "web_search",
        success: true,
        outputSummary: JSON.stringify({
          results: [{ url: "https://example.com/a", title: "From Search", snippet: "S" }],
          fetched_at: "2026-03-16T00:00:00Z",
        }),
      },
      {
        toolName: "web_fetch",
        success: true,
        outputSummary: JSON.stringify({
          url: "https://example.com/a",
          title: "From Fetch",
          fetched_at: "2026-03-16T00:00:00Z",
        }),
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 1);
    assert.equal(citations[0].title, "From Search"); // first seen wins
  });

  it("skips failed tool invocations", () => {
    const records = [
      {
        toolName: "web_search",
        success: false,
        outputSummary: JSON.stringify({ error: "timeout" }),
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 0);
  });

  it("handles truncated/invalid JSON gracefully", () => {
    const records = [
      {
        toolName: "web_search",
        success: true,
        outputSummary: '{"results":[{"url":"https://exam', // truncated
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 0); // no crash
  });

  it("ignores non-web tools", () => {
    const records = [
      {
        toolName: "memory_read",
        success: true,
        outputSummary: JSON.stringify({ url: "https://example.com" }),
      },
    ];

    const citations = extractWebCitations(records);
    assert.equal(citations.length, 0);
  });

  it("returns empty array for empty records", () => {
    assert.equal(extractWebCitations([]).length, 0);
  });
});

describe("extractBrowserSessions", () => {
  it("extracts browser session metadata from browser tool records", () => {
    const sessions = extractBrowserSessions([
      {
        toolName: "browser_navigate",
        success: true,
        outputSummary: JSON.stringify({
          session_id: "session-1",
          url: "https://example.com/start",
          artifact_count: 1,
        }),
      },
      {
        toolName: "browser_click",
        success: true,
        outputSummary: JSON.stringify({
          session_id: "session-1",
          current_url: "https://example.com/next",
          artifact_count: 2,
        }),
      },
    ]);

    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].session_id, "session-1");
    assert.equal(sessions[0].action_count, 2);
    assert.equal(sessions[0].artifact_count, 2);
    assert.deepEqual(sessions[0].urls_visited, [
      "https://example.com/start",
      "https://example.com/next",
    ]);
  });
});
