import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createWebSearchTool,
  setDefaultSearchProvider,
  type WebSearchProvider,
  type WebSearchResponse,
} from "./web-search.ts";

type ToolWithExecute = { execute: (args: Record<string, unknown>) => Promise<unknown> };

function mockProvider(results: WebSearchResponse["results"] = []): WebSearchProvider {
  return {
    name: "mock",
    async search(params) {
      return {
        results,
        query: params.query,
        provider: "mock",
        fetchedAt: "2026-03-16T00:00:00.000Z",
      };
    },
  };
}

describe("web_search tool", () => {
  afterEach(() => {
    setDefaultSearchProvider(null);
  });

  it("returns error when no provider is configured", async () => {
    setDefaultSearchProvider(null);
    // Clear env-based default
    const original = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const { web_search } = createWebSearchTool();
    const result = await (web_search as unknown as ToolWithExecute).execute({
      query: "test",
      max_results: 5,
    });

    assert.ok((result as Record<string, unknown>).error);
    process.env.TAVILY_API_KEY = original;
  });

  it("returns search results from provider", async () => {
    setDefaultSearchProvider(
      mockProvider([
        {
          title: "Example Page",
          url: "https://example.com",
          snippet: "This is a test result.",
          publishedDate: "2026-03-15",
          score: 0.95,
        },
        {
          title: "Another Page",
          url: "https://other.com",
          snippet: "Another result.",
          publishedDate: null,
          score: 0.8,
        },
      ])
    );

    const { web_search } = createWebSearchTool();
    const result = (await (web_search as unknown as ToolWithExecute).execute({
      query: "example query",
      max_results: 5,
    })) as Record<string, unknown>;

    assert.equal(result.query, "example query");
    assert.equal(result.result_count, 2);
    assert.equal(result.provider, "mock");
    assert.ok(result.fetched_at);

    const results = result.results as Array<Record<string, unknown>>;
    assert.equal(results[0].position, 1);
    assert.equal(results[0].title, "Example Page");
    assert.equal(results[0].url, "https://example.com");
    assert.equal(results[0].published_date, "2026-03-15");
    assert.equal(results[1].position, 2);
  });

  it("truncates long snippets", async () => {
    setDefaultSearchProvider(
      mockProvider([
        {
          title: "Long",
          url: "https://example.com",
          snippet: "x".repeat(2000),
          publishedDate: null,
          score: null,
        },
      ])
    );

    const { web_search } = createWebSearchTool();
    const result = (await (web_search as unknown as ToolWithExecute).execute({
      query: "test",
      max_results: 5,
    })) as Record<string, unknown>;

    const results = result.results as Array<Record<string, unknown>>;
    assert.ok((results[0].snippet as string).length <= 1001); // 1000 + "…"
  });

  it("handles provider errors gracefully", async () => {
    setDefaultSearchProvider({
      name: "failing",
      async search() {
        throw new Error("API key invalid");
      },
    });

    const { web_search } = createWebSearchTool();
    const result = (await (web_search as unknown as ToolWithExecute).execute({
      query: "test",
      max_results: 5,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("API key invalid"));
  });

  it("handles timeout errors", async () => {
    setDefaultSearchProvider({
      name: "slow",
      async search() {
        const err = new Error("timed out");
        err.name = "TimeoutError";
        throw err;
      },
    });

    const { web_search } = createWebSearchTool();
    const result = (await (web_search as unknown as ToolWithExecute).execute({
      query: "test",
      max_results: 5,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("timed out"));
  });

  it("returns empty results without error", async () => {
    setDefaultSearchProvider(mockProvider([]));

    const { web_search } = createWebSearchTool();
    const result = (await (web_search as unknown as ToolWithExecute).execute({
      query: "obscure query",
      max_results: 5,
    })) as Record<string, unknown>;

    assert.equal(result.result_count, 0);
    assert.deepEqual(result.results, []);
  });

  it("passes recency and domain filters to provider", async () => {
    let capturedParams: Record<string, unknown> = {};
    setDefaultSearchProvider({
      name: "capturing",
      async search(params) {
        capturedParams = { ...params };
        return {
          results: [],
          query: params.query,
          provider: "capturing",
          fetchedAt: new Date().toISOString(),
        };
      },
    });

    const { web_search } = createWebSearchTool();
    await (web_search as unknown as ToolWithExecute).execute({
      query: "test",
      max_results: 3,
      recency: "week",
      include_domains: ["github.com"],
      exclude_domains: ["reddit.com"],
    });

    assert.equal(capturedParams.query, "test");
    assert.equal(capturedParams.maxResults, 3);
    assert.equal(capturedParams.recency, "week");
    assert.deepEqual(capturedParams.includeDomains, ["github.com"]);
    assert.deepEqual(capturedParams.excludeDomains, ["reddit.com"]);
  });
});
