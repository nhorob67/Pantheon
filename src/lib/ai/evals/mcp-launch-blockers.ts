// ---------------------------------------------------------------------------
// Phase 7.1.1: MCP Launch Blockers
// ---------------------------------------------------------------------------

export interface LaunchBlocker {
  id: string;
  severity: "blocker" | "warning";
  category: "connection" | "execution" | "safety" | "observability" | "catalog";
  description: string;
  verification: string;
}

export const MCP_LAUNCH_BLOCKERS: LaunchBlocker[] = [
  // --- Connection ---
  {
    id: "mcp-connection-established",
    severity: "blocker",
    category: "connection",
    description: "MCP server connection can be established within timeout",
    verification: "mcp-client.test.ts: connection tests",
  },
  {
    id: "mcp-connection-pool-reuse",
    severity: "blocker",
    category: "connection",
    description: "Connections are reused from pool for the same server key",
    verification: "mcp-client.test.ts: pool reuse tests",
  },
  {
    id: "mcp-graceful-disconnect",
    severity: "blocker",
    category: "connection",
    description: "Disconnecting a server cleans up transport and pool entry",
    verification: "mcp-client.test.ts: disconnect tests",
  },
  {
    id: "mcp-reconnect-on-stale",
    severity: "warning",
    category: "connection",
    description: "Stale connections trigger automatic reconnection attempt",
    verification: "mcp-client.test.ts: reconnection tests",
  },

  // --- Execution ---
  {
    id: "mcp-tool-execution-success",
    severity: "blocker",
    category: "execution",
    description: "MCP tool calls execute and return parsed results",
    verification: "mcp-client.test.ts: execution tests",
  },
  {
    id: "mcp-tool-error-handling",
    severity: "blocker",
    category: "execution",
    description: "MCP tool errors (isError=true) are returned as error results",
    verification: "mcp-client.test.ts: error response tests",
  },
  {
    id: "mcp-tool-timeout",
    severity: "blocker",
    category: "execution",
    description: "MCP tool calls that exceed timeout return timeout error",
    verification: "mcp-client.test.ts: timeout tests",
  },
  {
    id: "mcp-json-parse-fallback",
    severity: "warning",
    category: "execution",
    description: "Non-JSON MCP results fall back to raw text without crashing",
    verification: "mcp-client.ts: lines 488-497 fallback logic",
  },

  // --- Safety ---
  {
    id: "mcp-blocked-tools-filtered",
    severity: "blocker",
    category: "safety",
    description: "Tools marked blocked=true in DB are excluded from tool set",
    verification: "mcp.ts: blocked tool filtering",
  },
  {
    id: "mcp-policy-enforcement",
    severity: "blocker",
    category: "safety",
    description: "MCP tools go through unified executor policy pipeline",
    verification: "unified-tool-executor.ts: MCP tool key resolution",
  },

  // --- Observability ---
  {
    id: "mcp-health-tracking",
    severity: "blocker",
    category: "observability",
    description: "Health status is tracked and queryable per MCP server",
    verification: "mcp-client.ts: health check function",
  },
  {
    id: "mcp-tool-invocations-traced",
    severity: "blocker",
    category: "observability",
    description: "MCP tool invocations appear in conversation traces",
    verification: "unified-tool-executor.ts: MCP invocation recording",
  },

  // --- Catalog ---
  {
    id: "mcp-tools-registered-in-catalog",
    severity: "blocker",
    category: "catalog",
    description: "Discovered MCP tools are registered in tenant_tools table",
    verification: "mcp-client.ts: discoverMcpTools registration logic",
  },
  {
    id: "mcp-tools-removed-on-rediscovery",
    severity: "warning",
    category: "catalog",
    description: "Tools removed from server are cleaned up on re-discovery",
    verification: "mcp-client.ts: dirty removal logic",
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

export function evaluateMcpLaunchReadiness(
  results: Array<{ blockerId: string; passed: boolean; detail: string }>
): LaunchReadiness {
  const matched = results.map((r) => ({
    blocker: MCP_LAUNCH_BLOCKERS.find((b) => b.id === r.blockerId)!,
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
