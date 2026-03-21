import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatActionFallback,
  formatInformationalFallback,
  getToolStatusMessage,
  isGenericInformationalResponse,
  type StepResult,
  type ExecutorRecord,
} from "./fallback-formatter.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSearchStep(results: Array<{ title: string; url: string; snippet: string }>): StepResult {
  return {
    toolResults: [
      {
        toolName: "web_search",
        result: {
          query: "test query",
          result_count: results.length,
          results: results.map((r, i) => ({ position: i + 1, ...r, published_date: null })),
          provider: "tavily",
          fetched_at: "2026-03-20T00:00:00Z",
          note: "Always cite the source URL.",
        },
      },
    ],
  };
}

function makeFetchStep(data: { url: string; title?: string; description?: string; content?: string }): StepResult {
  return {
    toolResults: [
      {
        toolName: "web_fetch",
        result: {
          url: data.url,
          title: data.title ?? null,
          description: data.description ?? null,
          content: data.content ?? null,
          content_type: "text/html",
          content_length: (data.content ?? "").length,
          truncated: false,
          fetched_at: "2026-03-20T00:00:00Z",
        },
      },
    ],
  };
}

function makeSearchRecord(results: Array<{ url: string; title: string; snippet: string }>): ExecutorRecord {
  return {
    toolName: "web_search",
    success: true,
    outputSummary: JSON.stringify({
      query: "test",
      result_count: results.length,
      results: results.map((r, i) => ({ position: i + 1, ...r })),
      provider: "tavily",
      fetched_at: "2026-03-20T00:00:00Z",
    }),
  };
}

// ---------------------------------------------------------------------------
// formatInformationalFallback
// ---------------------------------------------------------------------------

describe("formatInformationalFallback", () => {
  it("formats web_search results from full toolResults", () => {
    const steps: StepResult[] = [
      makeSearchStep([
        { title: "Page A", url: "https://example.com/a", snippet: "Snippet about page A" },
        { title: "Page B", url: "https://example.com/b", snippet: "Snippet about page B" },
        { title: "Page C", url: "https://example.com/c", snippet: "Snippet about page C" },
        { title: "Page D", url: "https://example.com/d", snippet: "Snippet about page D" },
      ]),
    ];
    const records: ExecutorRecord[] = [];

    const result = formatInformationalFallback(steps, records);
    assert.ok(result !== null);
    assert.ok(result!.includes("**Page A**"));
    assert.ok(result!.includes("https://example.com/a"));
    assert.ok(result!.includes("**Page B**"));
    assert.ok(result!.includes("**Page C**"));
    // 4th result should not be shown (max 3)
    assert.ok(!result!.includes("**Page D**"));
    assert.ok(result!.includes("1 more result"));
  });

  it("falls back to outputSummary when step data is missing", () => {
    const steps: StepResult[] = [{ toolResults: [] }];
    const records: ExecutorRecord[] = [
      makeSearchRecord([
        { title: "Summary Result", url: "https://example.com/summary", snippet: "From summary" },
      ]),
    ];

    const result = formatInformationalFallback(steps, records);
    assert.ok(result !== null);
    assert.ok(result!.includes("**Summary Result**"));
    assert.ok(result!.includes("https://example.com/summary"));
  });

  it("handles truncated outputSummary gracefully", () => {
    const truncated = '{"query":"test","result_count":2,"results":[{"position":1,"url":"https://exam';
    const steps: StepResult[] = [];
    const records: ExecutorRecord[] = [
      { toolName: "web_search", success: true, outputSummary: truncated },
    ];

    // Should not crash, returns null because no parseable results
    const result = formatInformationalFallback(steps, records);
    assert.equal(result, null);
  });

  it("formats web_fetch with title and description", () => {
    const steps: StepResult[] = [
      makeFetchStep({
        url: "https://example.com/page",
        title: "Fetched Page Title",
        description: "A great description of the page.",
      }),
    ];

    const result = formatInformationalFallback(steps, []);
    assert.ok(result !== null);
    assert.ok(result!.includes("**Fetched Page Title**"));
    assert.ok(result!.includes("A great description of the page."));
    assert.ok(result!.includes("https://example.com/page"));
  });

  it("formats web_fetch with only content (no description)", () => {
    const steps: StepResult[] = [
      makeFetchStep({
        url: "https://example.com/raw",
        title: "Raw Page",
        content: "This is the extracted page content that should be shown when no description exists.",
      }),
    ];

    const result = formatInformationalFallback(steps, []);
    assert.ok(result !== null);
    assert.ok(result!.includes("**Raw Page**"));
    assert.ok(result!.includes("This is the extracted page content"));
  });

  it("combines informational + action tools", () => {
    const steps: StepResult[] = [
      makeSearchStep([
        { title: "Result", url: "https://example.com/r", snippet: "Info" },
      ]),
    ];
    const records: ExecutorRecord[] = [
      makeSearchRecord([{ title: "Result", url: "https://example.com/r", snippet: "Info" }]),
      { toolName: "memory_create", success: true, outputSummary: "{}" },
    ];

    const result = formatInformationalFallback(steps, records);
    assert.ok(result !== null);
    assert.ok(result!.includes("**Result**"));
    assert.ok(result!.includes("I also saved that to memory"));
  });

  it("deduplicates URLs across search and fetch", () => {
    const steps: StepResult[] = [
      makeSearchStep([
        { title: "From Search", url: "https://example.com/same", snippet: "Search snippet" },
      ]),
      makeFetchStep({
        url: "https://example.com/same",
        title: "From Fetch",
        description: "Fetch description",
      }),
    ];

    const result = formatInformationalFallback(steps, []);
    assert.ok(result !== null);
    // URL should only appear once
    const urlCount = (result!.match(/https:\/\/example\.com\/same/g) || []).length;
    assert.equal(urlCount, 1);
  });

  it("enforces character limit", () => {
    // Create many results to exceed 1800 chars
    const bigResults = Array.from({ length: 3 }, (_, i) => ({
      title: `Very Long Title ${i} That Goes On And On And On And On`,
      url: `https://example.com/very-long-path-that-makes-the-url-quite-long-indeed-${i}`,
      snippet: "A".repeat(200),
    }));
    const steps: StepResult[] = [makeSearchStep(bigResults)];

    const result = formatInformationalFallback(steps, []);
    assert.ok(result !== null);
    assert.ok(result!.length <= 1800);
  });

  it("returns null for action-only tools", () => {
    const steps: StepResult[] = [];
    const records: ExecutorRecord[] = [
      { toolName: "memory_create", success: true, outputSummary: "{}" },
      { toolName: "schedule_create", success: true, outputSummary: "{}" },
    ];

    const result = formatInformationalFallback(steps, records);
    assert.equal(result, null);
  });

  it("returns null for empty inputs", () => {
    assert.equal(formatInformationalFallback([], []), null);
  });

  it("shows sparse results warning", () => {
    const steps: StepResult[] = [
      makeSearchStep([
        { title: "Only One", url: "https://example.com/one", snippet: "Lonely result" },
      ]),
    ];

    const result = formatInformationalFallback(steps, []);
    assert.ok(result !== null);
    assert.ok(result!.includes("limited"));
  });
});

// ---------------------------------------------------------------------------
// formatActionFallback
// ---------------------------------------------------------------------------

describe("formatActionFallback", () => {
  it("formats integration_api_call with a concrete success outcome", () => {
    const result = formatActionFallback([
      {
        toolName: "integration_api_call",
        success: true,
        outputSummary: JSON.stringify({
          status: 200,
          status_text: "OK",
          integration: "discourse",
          body: "{\"success\":true}",
        }),
      },
    ]);

    assert.equal(result, "Tried it again. Discourse responded with 200 OK. The response says: {\"success\":true}");
  });

  it("formats integration_api_call failures with API detail", () => {
    const result = formatActionFallback([
      {
        toolName: "integration_api_call",
        success: true,
        outputSummary: JSON.stringify({
          status: 401,
          status_text: "Unauthorized",
          integration: "discourse",
          body: "{\"error\":\"Invalid API key\"}",
        }),
      },
    ]);

    assert.equal(
      result,
      "Tried it again. Discourse responded with 401 Unauthorized, so the request still did not go through cleanly. The response says: Invalid API key"
    );
  });

  it("combines specialized integration outcomes with generic action confirmations", () => {
    const result = formatActionFallback([
      {
        toolName: "integration_api_call",
        success: true,
        outputSummary: JSON.stringify({
          status: 200,
          status_text: "OK",
          integration: "fullstack-ag",
          body: "",
        }),
      },
      {
        toolName: "integration_register",
        success: true,
        outputSummary: "{}",
      },
    ]);

    assert.equal(result, "Tried it again. Fullstack Ag responded with 200 OK. I also registered the integration.");
  });

  it("falls back to generic action copy when no specialized formatter exists", () => {
    const result = formatActionFallback([
      { toolName: "memory_create", success: true, outputSummary: "{}" },
    ]);

    assert.equal(result, "Done! I saved that to memory.");
  });
});

// ---------------------------------------------------------------------------
// getToolStatusMessage
// ---------------------------------------------------------------------------

describe("getToolStatusMessage", () => {
  it("returns status for web_search", () => {
    assert.equal(getToolStatusMessage("web_search"), "I'm checking a few sources now.");
  });

  it("returns status for web_fetch", () => {
    assert.equal(getToolStatusMessage("web_fetch"), "I'm reading through that now.");
  });

  it("returns status for memory_search", () => {
    assert.equal(getToolStatusMessage("memory_search"), "I'm checking what I already know about that.");
  });

  it("returns status for conversation_search", () => {
    assert.equal(getToolStatusMessage("conversation_search"), "I'm looking back through our earlier messages.");
  });

  it("returns status for delegation tools", () => {
    assert.equal(getToolStatusMessage("delegate_task"), "I'm looping in a teammate on that part.");
    assert.equal(getToolStatusMessage("delegate_task_async"), "I'm looping in a teammate on that part.");
  });

  it("returns status for browser_ tools", () => {
    assert.equal(getToolStatusMessage("browser_navigate"), "I'm opening it directly so I can check it myself.");
    assert.equal(getToolStatusMessage("browser_click"), "I'm opening it directly so I can check it myself.");
  });

  it("returns null for unknown/action tools", () => {
    assert.equal(getToolStatusMessage("memory_create"), null);
    assert.equal(getToolStatusMessage("schedule_toggle"), null);
    assert.equal(getToolStatusMessage("file_create"), null);
  });
});

// ---------------------------------------------------------------------------
// isGenericInformationalResponse
// ---------------------------------------------------------------------------

describe("isGenericInformationalResponse", () => {
  const infoRecord: ExecutorRecord = makeSearchRecord([
    { title: "R", url: "https://example.com", snippet: "S" },
  ]);

  it("detects 'Done! I web search.' pattern", () => {
    assert.ok(isGenericInformationalResponse("Done! I web search.", [infoRecord]));
  });

  it("detects 'Done! I searched the web.' pattern", () => {
    assert.ok(isGenericInformationalResponse("Done! I searched the web.", [infoRecord]));
  });

  it("detects 'All set! I searched for that.' pattern", () => {
    assert.ok(isGenericInformationalResponse("All set! I searched for that.", [infoRecord]));
  });

  it("detects very short responses with info tools", () => {
    assert.ok(isGenericInformationalResponse("I looked it up.", [infoRecord]));
  });

  it("detects responses without URLs despite search returning URLs", () => {
    const text = "I found some results about that topic. The information seems relevant to your question and I think you should know about it.";
    assert.ok(isGenericInformationalResponse(text, [infoRecord]));
  });

  it("does not flag responses that include URLs", () => {
    const text = "Here's what I found:\n\n**Page A** — Great info\nhttps://example.com/a\n\nThis covers your question about the topic.";
    assert.ok(!isGenericInformationalResponse(text, [infoRecord]));
  });

  it("does not flag when no informational tools were used", () => {
    const actionRecord: ExecutorRecord = { toolName: "memory_create", success: true, outputSummary: "{}" };
    assert.ok(!isGenericInformationalResponse("Done! I saved that to memory.", [actionRecord]));
  });

  it("does not flag when informational tools failed", () => {
    const failedRecord: ExecutorRecord = { toolName: "web_search", success: false, outputSummary: '{"error":"timeout"}' };
    assert.ok(!isGenericInformationalResponse("Done! I searched.", [failedRecord]));
  });
});
