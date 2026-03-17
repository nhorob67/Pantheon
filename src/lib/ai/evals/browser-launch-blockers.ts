// ---------------------------------------------------------------------------
// Phase 7.1.3: Browser Automation Launch Blockers
// ---------------------------------------------------------------------------

export interface LaunchBlocker {
  id: string;
  severity: "blocker" | "warning";
  category: "navigation" | "safety" | "session" | "observability" | "cost";
  description: string;
  verification: string;
}

export const BROWSER_LAUNCH_BLOCKERS: LaunchBlocker[] = [
  // --- Navigation ---
  {
    id: "browser-navigate-works",
    severity: "blocker",
    category: "navigation",
    description: "browser_navigate loads pages and returns page state",
    verification: "browser.test.ts: navigation tests",
  },
  {
    id: "browser-extract-works",
    severity: "blocker",
    category: "navigation",
    description: "browser_extract extracts structured content from pages",
    verification: "browser.test.ts: extraction tests",
  },
  {
    id: "browser-click-works",
    severity: "blocker",
    category: "navigation",
    description: "browser_click interacts with page elements",
    verification: "browser.test.ts: click tests",
  },
  {
    id: "browser-fill-works",
    severity: "blocker",
    category: "navigation",
    description: "browser_fill enters values in form fields",
    verification: "browser.test.ts: fill tests",
  },
  {
    id: "browser-screenshot-works",
    severity: "blocker",
    category: "navigation",
    description: "browser_screenshot captures page images",
    verification: "browser.test.ts: screenshot tests",
  },

  // --- Safety ---
  {
    id: "browser-ssrf-blocked",
    severity: "blocker",
    category: "safety",
    description: "Private IPs, localhost, and metadata endpoints are blocked",
    verification: "network-guard.ts: isBlockedHost tests",
  },
  {
    id: "browser-auth-urls-blocked",
    severity: "blocker",
    category: "safety",
    description: "Login/auth pages are detected and surfaced as auth failures before credential entry",
    verification: "network-guard.ts: isAuthUrl tests + browser-session.ts: navigation auth handling",
  },
  {
    id: "browser-sensitive-fields-blocked",
    severity: "blocker",
    category: "safety",
    description: "Password, credit card, SSN fields cannot be auto-filled",
    verification: "network-guard.ts: isSensitiveField tests",
  },
  {
    id: "browser-https-required",
    severity: "blocker",
    category: "safety",
    description: "Non-HTTPS URLs are blocked for browser navigation",
    verification: "browser.ts: URL validation schema",
  },

  // --- Session ---
  {
    id: "browser-session-quota",
    severity: "blocker",
    category: "session",
    description: "Session quota prevents unbounded session creation",
    verification: "browser.ts: checkBrowserSessionQuota",
  },
  {
    id: "browser-session-reuse",
    severity: "blocker",
    category: "session",
    description: "Existing sessions are reused (no duplicate creation)",
    verification: "browser.ts: lazy session creation promise",
  },
  {
    id: "browser-action-budget",
    severity: "blocker",
    category: "session",
    description: "Browser action budget in guardrails limits total actions",
    verification: "guardrails.ts: maxBrowserActions enforcement",
  },
  {
    id: "browser-no-progress-detection",
    severity: "blocker",
    category: "session",
    description: "Repeated actions with no state change are detected",
    verification: "guardrails.ts: checkBrowserProgress",
  },

  // --- Observability ---
  {
    id: "browser-sessions-in-trace",
    severity: "blocker",
    category: "observability",
    description: "Browser sessions appear in conversation traces",
    verification: "trace-recorder.ts: extractBrowserSessions",
  },
  {
    id: "browser-artifacts-in-inspector",
    severity: "warning",
    category: "observability",
    description: "Browser artifacts (screenshots) viewable in run inspector",
    verification: "run-inspector.tsx: BrowserSessionsPanel",
  },

  // --- Cost ---
  {
    id: "browser-session-cost-bounded",
    severity: "blocker",
    category: "cost",
    description: "Per-session and per-tenant cost limits prevent cost overruns",
    verification: "guardrails.ts: maxBrowserSessionMs + maxBrowserActions",
  },
];

export interface LaunchReadiness {
  ready: boolean;
  blockersPassing: number;
  blockersTotal: number;
  warningsPassing: number;
  warningsTotal: number;
  results: Array<{ blocker: LaunchBlocker; passed: boolean; detail: string }>;
}

export function evaluateBrowserLaunchReadiness(
  results: Array<{ blockerId: string; passed: boolean; detail: string }>
): LaunchReadiness {
  const matched = results.map((r) => ({
    blocker: BROWSER_LAUNCH_BLOCKERS.find((b) => b.id === r.blockerId)!,
    passed: r.passed,
    detail: r.detail,
  }));
  const blockers = matched.filter((m) => m.blocker?.severity === "blocker");
  const warnings = matched.filter((m) => m.blocker?.severity === "warning");
  return {
    ready: blockers.every((b) => b.passed),
    blockersPassing: blockers.filter((b) => b.passed).length,
    blockersTotal: blockers.length,
    warningsPassing: warnings.filter((w) => w.passed).length,
    warningsTotal: warnings.length,
    results: matched,
  };
}
