/**
 * Web Research Eval Scenarios
 *
 * Defines structured evaluation cases for web_search and web_fetch tools across
 * five SMB research categories. Each scenario includes:
 * - A realistic query
 * - Mock provider responses (for deterministic offline testing)
 * - Quality criteria for grading tool output
 *
 * These scenarios can be run against:
 * 1. Mock providers (unit/CI) — tests pipeline correctness and citation extraction
 * 2. Live providers (manual/staging) — tests real search quality
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
  score: number | null;
}

export interface WebSearchEvalScenario {
  id: string;
  category:
    | "prospect_research"
    | "competitive_research"
    | "vendor_lookup"
    | "documentation_lookup"
    | "knowledge_refresh";
  description: string;
  query: string;
  /** Optional recency filter to apply */
  recency?: "day" | "week" | "month" | "year";
  /** Optional domain filters */
  includeDomains?: string[];
  /** Mock results returned by the provider (for offline testing) */
  mockResults: EvalSearchResult[];
  /** Quality criteria this scenario must satisfy */
  criteria: EvalCriteria;
}

export interface WebFetchEvalScenario {
  id: string;
  category: WebSearchEvalScenario["category"];
  description: string;
  url: string;
  extractMode: "text" | "raw";
  /** Mock response body for offline testing */
  mockResponseBody: string;
  mockContentType: string;
  mockStatus: number;
  /** Quality criteria */
  criteria: EvalCriteria;
}

export interface EvalCriteria {
  /** Minimum number of results with valid URLs */
  minResultsWithUrls?: number;
  /** Minimum number of results with non-empty titles */
  minResultsWithTitles?: number;
  /** Minimum number of results with non-empty snippets */
  minResultsWithSnippets?: number;
  /** Every result URL must be HTTPS */
  allUrlsHttps?: boolean;
  /** No duplicate URLs in results */
  noDuplicateUrls?: boolean;
  /** Result must not be an error */
  mustSucceed?: boolean;
  /** Output must contain extracted content (for web_fetch) */
  mustHaveContent?: boolean;
  /** Output must have a title (for web_fetch) */
  mustHaveTitle?: boolean;
  /** Minimum content length (for web_fetch) */
  minContentLength?: number;
  /** Citation note must be present */
  mustHaveCitationNote?: boolean;
  /** Response must include fetched_at timestamp */
  mustHaveTimestamp?: boolean;
}

// ---------------------------------------------------------------------------
// Search eval scenarios
// ---------------------------------------------------------------------------

export const SEARCH_EVAL_SCENARIOS: WebSearchEvalScenario[] = [
  // ---- Prospect Research ----
  {
    id: "prospect-company-overview",
    category: "prospect_research",
    description: "Research a target company for sales outreach",
    query: "Acme Corp company overview products revenue headquarters",
    mockResults: [
      {
        title: "Acme Corp - About Us",
        url: "https://www.acmecorp.com/about",
        snippet:
          "Acme Corp is a leading provider of cloud infrastructure solutions, headquartered in San Francisco. Founded in 2015, the company serves over 5,000 businesses worldwide with annual revenue exceeding $200M.",
        publishedDate: null,
        score: 0.95,
      },
      {
        title: "Acme Corp - Crunchbase",
        url: "https://www.crunchbase.com/organization/acme-corp",
        snippet:
          "Acme Corp has raised $150M in Series C funding. The company provides cloud infrastructure solutions for enterprise customers.",
        publishedDate: "2025-11-15",
        score: 0.88,
      },
      {
        title: "Acme Corp LinkedIn",
        url: "https://www.linkedin.com/company/acme-corp",
        snippet:
          "Acme Corp | 1,200 followers on LinkedIn. Cloud infrastructure solutions for modern businesses. 500-1000 employees.",
        publishedDate: null,
        score: 0.82,
      },
    ],
    criteria: {
      minResultsWithUrls: 2,
      minResultsWithTitles: 2,
      minResultsWithSnippets: 2,
      allUrlsHttps: true,
      noDuplicateUrls: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
      mustHaveTimestamp: true,
    },
  },
  {
    id: "prospect-decision-makers",
    category: "prospect_research",
    description: "Find key decision makers at a target company",
    query: "Acme Corp CTO VP Engineering leadership team",
    mockResults: [
      {
        title: "Acme Corp Leadership | About",
        url: "https://www.acmecorp.com/leadership",
        snippet:
          "Meet the Acme Corp leadership team: Jane Smith (CEO), Bob Chen (CTO), Maria Garcia (VP Engineering), David Kim (CFO).",
        publishedDate: null,
        score: 0.91,
      },
      {
        title: "Bob Chen - CTO at Acme Corp | LinkedIn",
        url: "https://www.linkedin.com/in/bob-chen-cto",
        snippet:
          "Bob Chen is the CTO at Acme Corp. Previously led infrastructure at BigTech Inc. Stanford CS graduate.",
        publishedDate: null,
        score: 0.85,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      minResultsWithTitles: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },

  // ---- Competitive Research ----
  {
    id: "competitive-pricing-comparison",
    category: "competitive_research",
    description: "Compare competitor pricing for market positioning",
    query: "cloud infrastructure pricing comparison AWS Azure GCP 2026",
    recency: "month",
    mockResults: [
      {
        title: "Cloud Pricing Comparison 2026 - TechReview",
        url: "https://techreview.com/cloud-pricing-2026",
        snippet:
          "Our comprehensive cloud pricing comparison for 2026 covers AWS, Azure, and GCP across compute, storage, and networking. Key finding: GCP reduced prices by 15% on compute instances.",
        publishedDate: "2026-02-20",
        score: 0.93,
      },
      {
        title: "AWS vs Azure vs GCP: 2026 Cost Analysis",
        url: "https://cloudcosts.io/comparison-2026",
        snippet:
          "Updated cost analysis comparing the three major cloud providers. AWS remains most expensive for compute, Azure leads in hybrid, GCP cheapest for AI/ML workloads.",
        publishedDate: "2026-03-01",
        score: 0.90,
      },
      {
        title: "Cloud Infrastructure Market Report Q1 2026",
        url: "https://gartner.com/reports/cloud-q1-2026",
        snippet:
          "Gartner's Q1 2026 cloud market report shows AWS at 32% market share, Azure at 23%, GCP at 11%. Total market size reached $180B annually.",
        publishedDate: "2026-03-10",
        score: 0.87,
      },
    ],
    criteria: {
      minResultsWithUrls: 2,
      minResultsWithSnippets: 2,
      allUrlsHttps: true,
      noDuplicateUrls: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
      mustHaveTimestamp: true,
    },
  },
  {
    id: "competitive-feature-comparison",
    category: "competitive_research",
    description: "Compare specific feature across competitors",
    query: "HubSpot vs Salesforce CRM automation features comparison",
    mockResults: [
      {
        title: "HubSpot vs Salesforce: Complete CRM Comparison",
        url: "https://www.g2.com/compare/hubspot-vs-salesforce",
        snippet:
          "Side-by-side comparison of HubSpot and Salesforce CRM. HubSpot scores higher on ease of use (4.4 vs 4.0), Salesforce leads in customization (4.3 vs 3.8).",
        publishedDate: "2026-01-15",
        score: 0.92,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },

  // ---- Vendor Lookup ----
  {
    id: "vendor-evaluation",
    category: "vendor_lookup",
    description: "Evaluate a potential vendor/partner",
    query: "DataPipe Inc reviews security certifications SOC2 compliance",
    mockResults: [
      {
        title: "DataPipe Inc - Trust Center",
        url: "https://www.datapipe.io/trust",
        snippet:
          "DataPipe Inc maintains SOC 2 Type II, ISO 27001, and HIPAA certifications. Annual penetration tests conducted by independent third parties.",
        publishedDate: null,
        score: 0.94,
      },
      {
        title: "DataPipe Inc Reviews - G2",
        url: "https://www.g2.com/products/datapipe/reviews",
        snippet:
          "DataPipe Inc has 4.2/5 stars from 340 reviews on G2. Pros: reliable data pipeline, good support. Cons: pricing complexity, steep learning curve.",
        publishedDate: "2026-02-28",
        score: 0.89,
      },
      {
        title: "DataPipe Inc - Crunchbase",
        url: "https://www.crunchbase.com/organization/datapipe",
        snippet: "DataPipe Inc is a data integration company founded in 2018. Series B funded ($45M). 200 employees.",
        publishedDate: null,
        score: 0.78,
      },
    ],
    criteria: {
      minResultsWithUrls: 2,
      minResultsWithTitles: 2,
      allUrlsHttps: true,
      noDuplicateUrls: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },

  // ---- Documentation Lookup ----
  {
    id: "docs-api-reference",
    category: "documentation_lookup",
    description: "Find API documentation for a specific integration",
    query: "Stripe API create subscription documentation",
    includeDomains: ["stripe.com"],
    mockResults: [
      {
        title: "Create a subscription | Stripe API Reference",
        url: "https://stripe.com/docs/api/subscriptions/create",
        snippet:
          "Creates a new subscription on an existing customer. Each customer can have up to 500 active or scheduled subscriptions. POST /v1/subscriptions",
        publishedDate: null,
        score: 0.98,
      },
      {
        title: "Subscriptions | Stripe Documentation",
        url: "https://stripe.com/docs/billing/subscriptions/overview",
        snippet:
          "Learn how to create and manage subscriptions to accept recurring payments. Covers subscription lifecycle, billing cycles, and proration.",
        publishedDate: null,
        score: 0.91,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      minResultsWithTitles: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },
  {
    id: "docs-error-troubleshooting",
    category: "documentation_lookup",
    description: "Find documentation for troubleshooting a specific error",
    query: "PostgreSQL FATAL too many connections error fix",
    mockResults: [
      {
        title: "PostgreSQL: Documentation: Connection Limits",
        url: "https://www.postgresql.org/docs/current/runtime-config-connection.html",
        snippet:
          "max_connections (integer): Determines the maximum number of concurrent connections to the database server. Default is typically 100 connections.",
        publishedDate: null,
        score: 0.90,
      },
      {
        title: "How to Fix 'too many connections' in PostgreSQL - Stack Overflow",
        url: "https://stackoverflow.com/questions/12345/postgres-too-many-connections",
        snippet:
          "Solutions: 1) Increase max_connections in postgresql.conf 2) Use connection pooling (PgBouncer) 3) Check for connection leaks in your application.",
        publishedDate: "2025-08-12",
        score: 0.88,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },

  // ---- Knowledge Refresh ----
  {
    id: "knowledge-industry-update",
    category: "knowledge_refresh",
    description: "Get latest industry news and developments",
    query: "AI agent platforms market trends 2026",
    recency: "week",
    mockResults: [
      {
        title: "AI Agent Platforms: State of the Market in 2026",
        url: "https://techcrunch.com/2026/03/10/ai-agent-market-2026",
        snippet:
          "The AI agent platform market is projected to reach $15B by end of 2026. Key trends: multi-agent orchestration, tool-use capabilities, and enterprise safety controls.",
        publishedDate: "2026-03-10",
        score: 0.95,
      },
      {
        title: "Top AI Agent Builders for SMBs - Forbes",
        url: "https://www.forbes.com/ai-agent-builders-smb-2026",
        snippet:
          "Our review of the top AI agent platforms for small and medium businesses. Criteria: ease of setup, tool integrations, pricing, and safety features.",
        publishedDate: "2026-03-08",
        score: 0.88,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      minResultsWithSnippets: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
      mustHaveTimestamp: true,
    },
  },
  {
    id: "knowledge-regulation-update",
    category: "knowledge_refresh",
    description: "Check for regulatory changes affecting a business",
    query: "California data privacy law changes 2026 CCPA updates",
    recency: "month",
    mockResults: [
      {
        title: "CCPA 2026 Amendments: What Businesses Need to Know",
        url: "https://www.natlawreview.com/ccpa-2026-amendments",
        snippet:
          "The California Privacy Protection Agency finalized new rules effective July 2026. Key changes: automated decision-making opt-out rights, expanded data broker requirements.",
        publishedDate: "2026-02-25",
        score: 0.93,
      },
    ],
    criteria: {
      minResultsWithUrls: 1,
      allUrlsHttps: true,
      mustSucceed: true,
      mustHaveCitationNote: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Fetch eval scenarios
// ---------------------------------------------------------------------------

export const FETCH_EVAL_SCENARIOS: WebFetchEvalScenario[] = [
  {
    id: "fetch-company-about-page",
    category: "prospect_research",
    description: "Fetch and extract content from a company about page",
    url: "https://www.acmecorp.com/about",
    extractMode: "text",
    mockResponseBody: `<!DOCTYPE html>
<html><head><title>About Acme Corp</title>
<meta name="description" content="Learn about Acme Corp, a leading cloud infrastructure provider.">
</head><body>
<nav><a href="/">Home</a><a href="/about">About</a></nav>
<main>
<h1>About Acme Corp</h1>
<p>Acme Corp is a leading provider of cloud infrastructure solutions, headquartered in San Francisco, California.</p>
<p>Founded in 2015 by Jane Smith and Bob Chen, we serve over 5,000 businesses worldwide.</p>
<p>Our annual revenue exceeds $200M and we employ over 800 people across 5 offices globally.</p>
<h2>Our Mission</h2>
<p>To make cloud infrastructure simple, reliable, and affordable for businesses of all sizes.</p>
</main>
<script>window.analytics.track('page_view')</script>
</body></html>`,
    mockContentType: "text/html; charset=utf-8",
    mockStatus: 200,
    criteria: {
      mustSucceed: true,
      mustHaveContent: true,
      mustHaveTitle: true,
      minContentLength: 100,
      mustHaveTimestamp: true,
    },
  },
  {
    id: "fetch-api-json-response",
    category: "documentation_lookup",
    description: "Fetch a JSON API response in raw mode",
    url: "https://api.example.com/v1/status",
    extractMode: "raw",
    mockResponseBody: JSON.stringify({
      status: "operational",
      services: [
        { name: "API", status: "operational" },
        { name: "Dashboard", status: "degraded" },
      ],
      updated_at: "2026-03-16T12:00:00Z",
    }),
    mockContentType: "application/json",
    mockStatus: 200,
    criteria: {
      mustSucceed: true,
      mustHaveContent: true,
      minContentLength: 50,
      mustHaveTimestamp: true,
    },
  },
  {
    id: "fetch-article-with-long-content",
    category: "knowledge_refresh",
    description: "Fetch a long article and verify truncation works correctly",
    url: "https://blog.example.com/long-article",
    extractMode: "text",
    mockResponseBody: `<!DOCTYPE html>
<html><head><title>Very Long Industry Analysis</title>
<meta name="description" content="Comprehensive industry analysis for 2026.">
</head><body>
<article>
<h1>Very Long Industry Analysis</h1>
${"<p>This is a paragraph of analysis content that provides valuable insight into market trends and competitive dynamics in the cloud infrastructure space. </p>\n".repeat(200)}
</article>
</body></html>`,
    mockContentType: "text/html; charset=utf-8",
    mockStatus: 200,
    criteria: {
      mustSucceed: true,
      mustHaveContent: true,
      mustHaveTitle: true,
      mustHaveTimestamp: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Scenario counts for reporting
// ---------------------------------------------------------------------------

export const SCENARIO_COUNTS = {
  search: SEARCH_EVAL_SCENARIOS.length,
  fetch: FETCH_EVAL_SCENARIOS.length,
  total: SEARCH_EVAL_SCENARIOS.length + FETCH_EVAL_SCENARIOS.length,
  byCategory: {
    prospect_research: SEARCH_EVAL_SCENARIOS.filter((s) => s.category === "prospect_research").length
      + FETCH_EVAL_SCENARIOS.filter((s) => s.category === "prospect_research").length,
    competitive_research: SEARCH_EVAL_SCENARIOS.filter((s) => s.category === "competitive_research").length,
    vendor_lookup: SEARCH_EVAL_SCENARIOS.filter((s) => s.category === "vendor_lookup").length,
    documentation_lookup: SEARCH_EVAL_SCENARIOS.filter((s) => s.category === "documentation_lookup").length
      + FETCH_EVAL_SCENARIOS.filter((s) => s.category === "documentation_lookup").length,
    knowledge_refresh: SEARCH_EVAL_SCENARIOS.filter((s) => s.category === "knowledge_refresh").length
      + FETCH_EVAL_SCENARIOS.filter((s) => s.category === "knowledge_refresh").length,
  },
};
