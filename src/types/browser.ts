// ---------------------------------------------------------------------------
// Browser Automation Types — Phase 5
// ---------------------------------------------------------------------------

export interface BrowserSessionConfig {
  maxActions: number;
  maxDurationMs: number;
  domainAllowlist: string[];
  domainBlocklist: string[];
  baseCostCents: number;
  perActionCostCents: number;
}

export const DEFAULT_BROWSER_SESSION_CONFIG: Readonly<BrowserSessionConfig> = {
  maxActions: 25,
  maxDurationMs: 120_000,
  domainAllowlist: [],
  domainBlocklist: [],
  baseCostCents: 2,
  perActionCostCents: 1,
};

export type BrowserSessionStatus =
  | "idle"
  | "active"
  | "completed"
  | "failed"
  | "timed_out";

export interface BrowserSessionState {
  id: string;
  tenantId: string;
  customerId: string;
  runId: string;
  agentId: string | null;
  status: BrowserSessionStatus;
  currentUrl: string | null;
  currentTitle: string | null;
  urlsVisited: string[];
  actionCount: number;
  artifacts: BrowserArtifact[];
  startedAt: number;
  costCents: number;
}

export type BrowserArtifactKind =
  | "screenshot"
  | "dom_snapshot"
  | "structured_output"
  | "step_log";

export interface BrowserArtifact {
  id: string;
  sessionId: string;
  kind: BrowserArtifactKind;
  storageKey: string;
  actionIndex: number;
  metadata?: Record<string, unknown>;
}

export interface BrowserActionResult {
  success: boolean;
  output: Record<string, unknown>;
  artifacts: BrowserArtifact[];
  error?: {
    class: BrowserErrorClass;
    message: string;
    retryable: boolean;
  };
  pageState?: {
    url: string;
    title: string;
    hasContent: boolean;
  };
}

export type BrowserErrorClass =
  | "site_breakage"
  | "auth_failure"
  | "selector_failure"
  | "policy_denial"
  | "budget_exceeded";

export interface BrowserPolicy {
  domainAllowlist: string[];
  domainBlocklist: string[];
  requireApprovalActions: string[];
  maxSessionsPerDay: number;
  maxActionsPerSession: number;
  maxSessionDurationMs: number;
  baseCostCents: number;
  perActionCostCents: number;
}

export const DEFAULT_BROWSER_POLICY: Readonly<BrowserPolicy> = {
  domainAllowlist: [],
  domainBlocklist: [],
  requireApprovalActions: ["click", "fill"],
  maxSessionsPerDay: 10,
  maxActionsPerSession: 25,
  maxSessionDurationMs: 120_000,
  baseCostCents: 2,
  perActionCostCents: 1,
};

export interface BrowserSessionSummary {
  sessionId: string;
  actionCount: number;
  durationMs: number;
  status: BrowserSessionStatus;
  urlsVisited: string[];
  artifactCount: number;
}
