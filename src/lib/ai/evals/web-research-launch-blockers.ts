/**
 * Web Research Launch Blockers
 *
 * Defines the criteria that must pass before web_search and web_fetch
 * can be rolled out to production tenants. Each blocker is a testable
 * condition with a severity and description.
 *
 * These are evaluated by the eval test suite and reported as a launch
 * readiness summary.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaunchBlocker {
  id: string;
  severity: "blocker" | "warning";
  category: "citation" | "safety" | "quality" | "observability" | "policy";
  description: string;
  /** How to verify this blocker is resolved */
  verification: string;
}

export interface LaunchReadiness {
  ready: boolean;
  blockersPassing: number;
  blockersTotal: number;
  warningsPassing: number;
  warningsTotal: number;
  results: Array<{
    blocker: LaunchBlocker;
    passed: boolean;
    detail: string;
  }>;
}

// ---------------------------------------------------------------------------
// Blocker definitions
// ---------------------------------------------------------------------------

export const LAUNCH_BLOCKERS: LaunchBlocker[] = [
  // ---- Citation blockers ----
  {
    id: "citation-urls-present",
    severity: "blocker",
    category: "citation",
    description: "Every web_search result must include a source URL",
    verification:
      "All eval scenarios with mustSucceed produce results where every item has a non-empty URL",
  },
  {
    id: "citation-note-present",
    severity: "blocker",
    category: "citation",
    description: "web_search responses must include citation guidance for the agent",
    verification:
      "The 'note' field is present and non-empty in every successful web_search response",
  },
  {
    id: "citation-persistence",
    severity: "blocker",
    category: "citation",
    description: "Web citations must be persisted in conversation traces",
    verification:
      "extractWebCitations() returns non-empty results for runs that used web_search/web_fetch",
  },
  {
    id: "citation-no-hallucinated-urls",
    severity: "blocker",
    category: "citation",
    description: "Tool must never fabricate URLs — all URLs must come from the search provider",
    verification:
      "web_search results match provider response exactly; web_fetch only returns the requested URL",
  },

  // ---- Safety blockers ----
  {
    id: "safety-ssrf-protection",
    severity: "blocker",
    category: "safety",
    description: "web_fetch must block SSRF attempts (localhost, private IPs, metadata endpoints)",
    verification: "All SSRF test cases in web-fetch.test.ts pass",
  },
  {
    id: "safety-https-only",
    severity: "blocker",
    category: "safety",
    description: "web_fetch must reject non-HTTPS URLs",
    verification: "HTTP URLs are rejected with a clear error message",
  },
  {
    id: "safety-content-type-filtering",
    severity: "blocker",
    category: "safety",
    description: "web_fetch must reject binary/media content types",
    verification: "Non-text MIME types are rejected",
  },
  {
    id: "safety-body-size-cap",
    severity: "blocker",
    category: "safety",
    description: "web_fetch must enforce body size limits to prevent memory exhaustion",
    verification: "Content exceeding MAX_BODY_LENGTH is truncated",
  },
  {
    id: "safety-timeout",
    severity: "blocker",
    category: "safety",
    description: "Both tools must enforce request timeouts",
    verification: "Requests exceeding 15s timeout return a clear error",
  },

  // ---- Quality blockers ----
  {
    id: "quality-search-returns-results",
    severity: "blocker",
    category: "quality",
    description: "web_search must return results for common research queries",
    verification:
      "All eval scenarios produce at least 1 result (with mock provider, verifies pipeline correctness)",
  },
  {
    id: "quality-fetch-extracts-content",
    severity: "blocker",
    category: "quality",
    description: "web_fetch must extract readable text from HTML pages",
    verification:
      "HTML extraction removes scripts/styles and produces readable text with title and description",
  },
  {
    id: "quality-fallback-guidance",
    severity: "warning",
    category: "quality",
    description: "web_search should provide helpful guidance when results are sparse",
    verification:
      "0-result responses include suggestions to rephrase; sparse responses suggest broadening",
  },
  {
    id: "quality-freshness-context",
    severity: "warning",
    category: "quality",
    description: "web_search should include date context for time-sensitive queries",
    verification: "Tool description includes current date and recency filter guidance",
  },

  // ---- Observability blockers ----
  {
    id: "obs-trace-recording",
    severity: "blocker",
    category: "observability",
    description: "web_search and web_fetch invocations must appear in conversation traces",
    verification:
      "Both tools are tracked by the unified executor and appear in toolsInvoked trace data",
  },
  {
    id: "obs-policy-evaluation",
    severity: "blocker",
    category: "observability",
    description: "Both tools must be policy-evaluated through the unified executor",
    verification:
      "Tools are in NATIVE_TOOL_CATALOG and policy decisions are recorded in invocation records",
  },
  {
    id: "obs-citation-display",
    severity: "warning",
    category: "observability",
    description: "Web citations should be displayed in the dashboard trace view",
    verification:
      "TraceCitations component renders in conversation-replay.tsx when web_citations are present",
  },

  // ---- Policy blockers ----
  {
    id: "policy-catalog-registered",
    severity: "blocker",
    category: "policy",
    description: "web_search and web_fetch must be registered in the native tool catalog",
    verification:
      "Both tools exist in NATIVE_TOOL_CATALOG with correct risk levels and capabilities",
  },
  {
    id: "policy-tenant-gated",
    severity: "blocker",
    category: "policy",
    description: "Both tools must be gated by tenant tool status (enable/disable per tenant)",
    verification:
      "Tools are seeded into tenant_tools via ensureNativeToolCatalog() and respect status field",
  },
  {
    id: "policy-rollout-flag",
    severity: "warning",
    category: "policy",
    description: "Both tools should be controllable via rollout flags for staged enablement",
    verification: "Rollout flag matrix includes web_search and web_fetch feature flags",
  },
];

// ---------------------------------------------------------------------------
// Readiness evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate launch readiness based on a set of blocker check results.
 * `ready` is true only if ALL blocker-severity items pass.
 * Warnings are reported but do not block launch.
 */
export function evaluateLaunchReadiness(
  results: Array<{ blockerId: string; passed: boolean; detail: string }>
): LaunchReadiness {
  const readinessResults = results.map((r) => {
    const blocker = LAUNCH_BLOCKERS.find((b) => b.id === r.blockerId);
    if (!blocker) throw new Error(`Unknown blocker ID: ${r.blockerId}`);
    return { blocker, passed: r.passed, detail: r.detail };
  });

  const blockers = readinessResults.filter((r) => r.blocker.severity === "blocker");
  const warnings = readinessResults.filter((r) => r.blocker.severity === "warning");

  return {
    ready: blockers.every((b) => b.passed),
    blockersPassing: blockers.filter((b) => b.passed).length,
    blockersTotal: blockers.length,
    warningsPassing: warnings.filter((w) => w.passed).length,
    warningsTotal: warnings.length,
    results: readinessResults,
  };
}
