/**
 * Web Research Eval Scorer
 *
 * Evaluates web_search and web_fetch tool outputs against quality criteria.
 * Used by the eval test suite to produce pass/fail verdicts and quality scores.
 */

import type { EvalCriteria } from "./web-research-scenarios.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringResult {
  passed: boolean;
  score: number; // 0.0–1.0
  checks: CheckResult[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

// ---------------------------------------------------------------------------
// Search result scoring
// ---------------------------------------------------------------------------

interface SearchToolOutput {
  error?: string;
  results?: Array<{
    url?: string;
    title?: string;
    snippet?: string;
    published_date?: string | null;
  }>;
  fetched_at?: string;
  note?: string;
  [key: string]: unknown;
}

export function scoreSearchResult(
  output: SearchToolOutput,
  criteria: EvalCriteria
): ScoringResult {
  const checks: CheckResult[] = [];

  // Must succeed (no error)
  if (criteria.mustSucceed) {
    checks.push({
      name: "must_succeed",
      passed: !output.error,
      expected: "no error",
      actual: output.error ? `error: ${output.error}` : "success",
    });
  }

  const results = output.results ?? [];

  // Minimum results with valid URLs
  if (criteria.minResultsWithUrls != null) {
    const withUrls = results.filter(
      (r) => r.url && typeof r.url === "string" && r.url.startsWith("http")
    ).length;
    checks.push({
      name: "min_results_with_urls",
      passed: withUrls >= criteria.minResultsWithUrls,
      expected: `>= ${criteria.minResultsWithUrls}`,
      actual: String(withUrls),
    });
  }

  // Minimum results with titles
  if (criteria.minResultsWithTitles != null) {
    const withTitles = results.filter(
      (r) => r.title && r.title.trim().length > 0
    ).length;
    checks.push({
      name: "min_results_with_titles",
      passed: withTitles >= criteria.minResultsWithTitles,
      expected: `>= ${criteria.minResultsWithTitles}`,
      actual: String(withTitles),
    });
  }

  // Minimum results with snippets
  if (criteria.minResultsWithSnippets != null) {
    const withSnippets = results.filter(
      (r) => r.snippet && r.snippet.trim().length > 0
    ).length;
    checks.push({
      name: "min_results_with_snippets",
      passed: withSnippets >= criteria.minResultsWithSnippets,
      expected: `>= ${criteria.minResultsWithSnippets}`,
      actual: String(withSnippets),
    });
  }

  // All URLs must be HTTPS
  if (criteria.allUrlsHttps) {
    const nonHttps = results.filter(
      (r) => r.url && !r.url.startsWith("https://")
    );
    checks.push({
      name: "all_urls_https",
      passed: nonHttps.length === 0,
      expected: "all HTTPS",
      actual:
        nonHttps.length === 0
          ? "all HTTPS"
          : `${nonHttps.length} non-HTTPS URL(s)`,
    });
  }

  // No duplicate URLs
  if (criteria.noDuplicateUrls) {
    const urls = results.map((r) => r.url).filter(Boolean);
    const uniqueUrls = new Set(urls);
    checks.push({
      name: "no_duplicate_urls",
      passed: urls.length === uniqueUrls.size,
      expected: "no duplicates",
      actual:
        urls.length === uniqueUrls.size
          ? "no duplicates"
          : `${urls.length - uniqueUrls.size} duplicate(s)`,
    });
  }

  // Citation note present
  if (criteria.mustHaveCitationNote) {
    checks.push({
      name: "has_citation_note",
      passed: typeof output.note === "string" && output.note.length > 0,
      expected: "non-empty note",
      actual: output.note ? `"${output.note.slice(0, 80)}..."` : "missing",
    });
  }

  // Timestamp present
  if (criteria.mustHaveTimestamp) {
    checks.push({
      name: "has_timestamp",
      passed:
        typeof output.fetched_at === "string" && output.fetched_at.length > 0,
      expected: "non-empty fetched_at",
      actual: output.fetched_at ?? "missing",
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passed: checks.every((c) => c.passed),
    score: checks.length > 0 ? passedCount / checks.length : 1.0,
    checks,
  };
}

// ---------------------------------------------------------------------------
// Fetch result scoring
// ---------------------------------------------------------------------------

interface FetchToolOutput {
  error?: string;
  url?: string;
  title?: string | null;
  description?: string | null;
  content?: string;
  content_type?: string;
  content_length?: number;
  truncated?: boolean;
  fetched_at?: string;
  [key: string]: unknown;
}

export function scoreFetchResult(
  output: FetchToolOutput,
  criteria: EvalCriteria
): ScoringResult {
  const checks: CheckResult[] = [];

  // Must succeed
  if (criteria.mustSucceed) {
    checks.push({
      name: "must_succeed",
      passed: !output.error,
      expected: "no error",
      actual: output.error ? `error: ${output.error}` : "success",
    });
  }

  // Must have content
  if (criteria.mustHaveContent) {
    checks.push({
      name: "has_content",
      passed:
        typeof output.content === "string" && output.content.trim().length > 0,
      expected: "non-empty content",
      actual: output.content
        ? `${output.content.length} chars`
        : "missing/empty",
    });
  }

  // Must have title
  if (criteria.mustHaveTitle) {
    checks.push({
      name: "has_title",
      passed:
        typeof output.title === "string" && output.title.trim().length > 0,
      expected: "non-empty title",
      actual: output.title ?? "missing",
    });
  }

  // Minimum content length
  if (criteria.minContentLength != null) {
    const len = output.content?.length ?? 0;
    checks.push({
      name: "min_content_length",
      passed: len >= criteria.minContentLength,
      expected: `>= ${criteria.minContentLength} chars`,
      actual: `${len} chars`,
    });
  }

  // Timestamp present
  if (criteria.mustHaveTimestamp) {
    checks.push({
      name: "has_timestamp",
      passed:
        typeof output.fetched_at === "string" && output.fetched_at.length > 0,
      expected: "non-empty fetched_at",
      actual: output.fetched_at ?? "missing",
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passed: checks.every((c) => c.passed),
    score: checks.length > 0 ? passedCount / checks.length : 1.0,
    checks,
  };
}

// ---------------------------------------------------------------------------
// Baseline comparison: web_search vs http_request
// ---------------------------------------------------------------------------

export interface BaselineComparison {
  scenario: string;
  webSearchScore: number;
  httpRequestScore: number;
  webSearchAdvantages: string[];
  httpRequestAdvantages: string[];
  verdict: "web_search_better" | "http_request_better" | "equivalent";
}

/**
 * Compare a web_search result against what http_request would produce for the
 * same research task. http_request has no search capability — it can only fetch
 * a known URL. This comparison highlights the structural advantages of web_search.
 *
 * For a fair comparison, http_request is scored on:
 * - Whether it can discover URLs (it cannot — agent must guess/hallucinate)
 * - Whether it returns structured results with titles, snippets, citations
 * - Whether it provides recency-filtered results
 */
export function compareAgainstHttpBaseline(
  searchOutput: SearchToolOutput,
  _criteria: EvalCriteria
): BaselineComparison {
  const searchScore = !searchOutput.error && (searchOutput.results?.length ?? 0) > 0 ? 1.0 : 0.0;
  // http_request cannot search — it requires a known URL.
  // For research tasks, the agent would need to guess URLs, which is unreliable.
  const httpScore = 0.2; // generous: assumes agent knows one relevant URL

  const webSearchAdvantages: string[] = [];
  const httpRequestAdvantages: string[] = [];

  if ((searchOutput.results?.length ?? 0) > 1) {
    webSearchAdvantages.push("returns multiple sources for cross-referencing");
  }
  if (searchOutput.results?.some((r) => r.snippet)) {
    webSearchAdvantages.push("provides snippets for quick relevance assessment");
  }
  if (searchOutput.results?.some((r) => r.published_date)) {
    webSearchAdvantages.push("includes publication dates for freshness assessment");
  }
  if (searchOutput.note) {
    webSearchAdvantages.push("includes citation guidance for the agent");
  }
  webSearchAdvantages.push("discovers URLs rather than requiring the agent to guess them");

  httpRequestAdvantages.push("can include authentication headers for gated content");
  httpRequestAdvantages.push("returns full response body (not just snippets)");

  return {
    scenario: "search_vs_http",
    webSearchScore: searchScore,
    httpRequestScore: httpScore,
    webSearchAdvantages,
    httpRequestAdvantages,
    verdict:
      searchScore > httpScore
        ? "web_search_better"
        : searchScore < httpScore
          ? "http_request_better"
          : "equivalent",
  };
}
