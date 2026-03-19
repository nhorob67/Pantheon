import type { TenantRole } from "./tenant-role-policy";

// ---------------------------------------------------------------------------
// Risk & Source
// ---------------------------------------------------------------------------

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ToolSource =
  | { type: "native" }
  | { type: "composio"; composioToolName: string }
  | { type: "mcp"; serverKey: string; serverToolName: string }
  | { type: "extension"; extensionId: string }
  | { type: "browser"; action: string };

export type ToolSourceType = ToolSource["type"];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type ToolCategory =
  | "memory"
  | "schedule"
  | "self-config"
  | "credentials"
  | "network"
  | "delegation"
  | "composio"
  | "mcp"
  | "browser"
  | "file-creation"
  | "integrations"
  | "internal-control";

// ---------------------------------------------------------------------------
// Capability flags
// ---------------------------------------------------------------------------

export interface ToolCapabilities {
  /** Tool makes network requests to external services */
  networkAccess: boolean;
  /** Tool writes or mutates persistent state */
  writesState: boolean;
  /** Tool should require human approval by default (derived from risk level) */
  requiresApproval: boolean;
  /** Tool can stream partial results */
  supportsStreaming: boolean;
}

// ---------------------------------------------------------------------------
// Canonical Tool Metadata
// ---------------------------------------------------------------------------

/**
 * Static metadata describing a tool — used for catalog registration,
 * policy evaluation, and UI display.
 *
 * Does NOT include the runtime implementation (inputSchema / execute).
 * Those are linked in Phase 1.2 when the unified executor wraps AI SDK tools.
 */
export interface CanonicalToolMeta {
  toolKey: string;
  displayName: string;
  description: string;
  source: ToolSource;
  category: ToolCategory;
  riskLevel: RiskLevel;
  capabilities: ToolCapabilities;
}

// ---------------------------------------------------------------------------
// Canonical Tool Result Envelope
// ---------------------------------------------------------------------------

/**
 * Every tool execution returns this uniform shape.
 * Returned by the unified executor (Phase 1.2).
 */
export interface ToolResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: {
    class: string;
    message: string;
    retryable: boolean;
  };
  meta?: {
    durationMs: number;
    invocationId: string;
    policyDecision: "allowed" | "denied" | "requires_approval";
  };
}

// ---------------------------------------------------------------------------
// Tool Execution Context
// ---------------------------------------------------------------------------

/**
 * Context passed to tool implementations by the unified executor.
 */
export interface ToolExecutionContext {
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runId: string | null;
  actorRole: TenantRole;
  actorId: string | null;
}
