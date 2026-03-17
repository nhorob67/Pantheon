import { tool } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

/**
 * A single search result from any provider.
 */
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
  /** Provider-specific relevance score (0–1), if available. */
  score: number | null;
}

/**
 * Provider-agnostic response from a web search.
 */
export interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
  provider: string;
  fetchedAt: string;
}

/**
 * Interface that any search provider must implement.
 * Swap providers (Tavily, Brave, Serper, etc.) without changing tool contracts.
 */
export interface WebSearchProvider {
  name: string;
  search(params: {
    query: string;
    maxResults: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    recency?: "day" | "week" | "month" | "year";
  }): Promise<WebSearchResponse>;
}

// ---------------------------------------------------------------------------
// Tavily provider (default)
// ---------------------------------------------------------------------------

const TAVILY_TIMEOUT_MS = 15_000;
const TAVILY_MAX_RESULTS = 10;

interface TavilySearchResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilySearchResult[];
  query?: string;
}

export function createTavilyProvider(apiKey: string): WebSearchProvider {
  return {
    name: "tavily",
    async search(params) {
      const body: Record<string, unknown> = {
        query: params.query,
        max_results: Math.min(params.maxResults, TAVILY_MAX_RESULTS),
        search_depth: "advanced",
        include_answer: false,
      };

      if (params.includeDomains && params.includeDomains.length > 0) {
        body.include_domains = params.includeDomains;
      }
      if (params.excludeDomains && params.excludeDomains.length > 0) {
        body.exclude_domains = params.excludeDomains;
      }
      if (params.recency === "day") {
        body.days = 1;
      } else if (params.recency === "week") {
        body.days = 7;
      } else if (params.recency === "month") {
        body.days = 30;
      } else if (params.recency === "year") {
        body.days = 365;
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Tavily search failed (${response.status}): ${text.slice(0, 200)}`);
      }

      const data = (await response.json()) as TavilySearchResponse;
      const results: WebSearchResult[] = (data.results ?? []).map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: r.content ?? "",
        publishedDate: r.published_date ?? null,
        score: typeof r.score === "number" ? r.score : null,
      }));

      return {
        results,
        query: data.query ?? params.query,
        provider: "tavily",
        fetchedAt: new Date().toISOString(),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Default provider resolution
// ---------------------------------------------------------------------------

let defaultProvider: WebSearchProvider | null = null;

/**
 * Get the default web search provider. Falls back to Tavily if
 * TAVILY_API_KEY is set in the environment.
 */
export function getDefaultSearchProvider(): WebSearchProvider | null {
  if (defaultProvider) return defaultProvider;
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  defaultProvider = createTavilyProvider(apiKey);
  return defaultProvider;
}

/** Override the default provider (for testing or custom providers). */
export function setDefaultSearchProvider(provider: WebSearchProvider | null): void {
  defaultProvider = provider;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

const MAX_QUERY_LENGTH = 400;
const MAX_SNIPPET_LENGTH = 1_000;
const DEFAULT_MAX_RESULTS = 5;

/**
 * Creates the `web_search` tool for agent-driven web research.
 *
 * Returns search results with source URLs, titles, snippets, and
 * publication dates for citation and grounding.
 */
export function createWebSearchTool() {
  return {
    web_search: tool({
      description:
        "Search the web for information. Returns a list of results with titles, URLs, " +
        "snippets, and publication dates. Use this for research tasks: finding companies, " +
        "people, products, news, documentation, pricing, or any public information. " +
        "Prefer web_search over http_request for open-web discovery. " +
        "Always cite the source URL when using information from search results. " +
        `Today's date is ${new Date().toISOString().slice(0, 10)}. ` +
        "For time-sensitive queries, use the recency filter to get recent results.",
      inputSchema: z.object({
        query: z
          .string()
          .max(MAX_QUERY_LENGTH)
          .describe("The search query. Be specific and include relevant context for better results."),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(DEFAULT_MAX_RESULTS)
          .describe("Number of results to return (1-10, default 5)"),
        recency: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Filter results by recency. Omit for no time restriction."),
        include_domains: z
          .array(z.string())
          .optional()
          .describe("Only include results from these domains (e.g., ['github.com', 'docs.python.org'])"),
        exclude_domains: z
          .array(z.string())
          .optional()
          .describe("Exclude results from these domains"),
      }),
      execute: async ({ query, max_results, recency, include_domains, exclude_domains }) => {
        const provider = getDefaultSearchProvider();
        if (!provider) {
          return {
            error: "Web search is not configured. A search API key must be set by the platform administrator.",
          };
        }

        try {
          const response = await provider.search({
            query,
            maxResults: max_results,
            includeDomains: include_domains,
            excludeDomains: exclude_domains,
            recency,
          });

          // Truncate long snippets to keep context window manageable
          const results = response.results.map((r, i) => ({
            position: i + 1,
            title: r.title,
            url: r.url,
            snippet: r.snippet.length > MAX_SNIPPET_LENGTH
              ? r.snippet.slice(0, MAX_SNIPPET_LENGTH) + "…"
              : r.snippet,
            published_date: r.publishedDate,
          }));

          // Fallback guidance when results are sparse or low quality
          let note = "Always cite the source URL when presenting information from these results.";
          if (results.length === 0) {
            note =
              "No results found. Try rephrasing the query, using broader terms, " +
              "removing domain filters, or using web_fetch directly if you have a specific URL.";
          } else if (results.length < 3) {
            note =
              "Few results returned. Consider broadening the query or trying alternative " +
              "search terms for more comprehensive results. Always cite the source URL.";
          }

          return {
            query: response.query,
            result_count: results.length,
            results,
            provider: response.provider,
            fetched_at: response.fetchedAt,
            note,
          };
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === "AbortError" || err.name === "TimeoutError") {
              return { error: "Web search timed out. Try a simpler query." };
            }
            return { error: `Web search failed: ${err.message}` };
          }
          return { error: "Web search failed" };
        }
      },
    }),
  };
}
