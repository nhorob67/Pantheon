// ---------------------------------------------------------------------------
// Phase 7.1.1: MCP Eval Scenarios
// Deterministic scenarios for testing MCP tool discovery, execution,
// connection lifecycle, error handling, and health monitoring.
// ---------------------------------------------------------------------------

export interface McpEvalScenario {
  id: string;
  category:
    | "discovery"
    | "execution"
    | "connection_lifecycle"
    | "error_handling"
    | "health";
  description: string;
  setup: McpSetup;
  expected: McpExpectedOutcome;
}

export interface McpSetup {
  /** Mock server config */
  server: {
    key: string;
    transport: "stdio" | "sse";
    healthy: boolean;
    /** Tools the mock server advertises */
    tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
  };
  /** Tool call to execute (null for discovery-only scenarios) */
  toolCall?: {
    toolName: string;
    args: Record<string, unknown>;
    /** Mock result from MCP server */
    mockResult?: { content: string; isError?: boolean };
    /** Simulate timeout */
    timeout?: boolean;
    /** Simulate connection loss */
    connectionLost?: boolean;
  };
}

export interface McpExpectedOutcome {
  /** Whether tool discovery should succeed */
  discoverySuccess?: boolean;
  /** Number of tools discovered */
  toolCount?: number;
  /** Whether tool execution should succeed */
  executionSuccess?: boolean;
  /** Expected error class if execution fails */
  errorClass?: string;
  /** Health status after operation */
  healthStatus?: "healthy" | "unreachable" | "degraded" | "unhealthy";
  /** Whether tools should be registered in tenant_tools */
  registeredInCatalog?: boolean;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const MCP_EVAL_SCENARIOS: McpEvalScenario[] = [
  // --- Discovery ---
  {
    id: "mcp-discover-tools-success",
    category: "discovery",
    description: "Discovers tools from a healthy MCP server and registers them",
    setup: {
      server: {
        key: "test-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "get_weather",
            description: "Get weather for a location",
            inputSchema: {
              type: "object",
              properties: { location: { type: "string" } },
              required: ["location"],
            },
          },
          {
            name: "search_docs",
            description: "Search documentation",
            inputSchema: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        ],
      },
    },
    expected: {
      discoverySuccess: true,
      toolCount: 2,
      registeredInCatalog: true,
    },
  },
  {
    id: "mcp-discover-empty-server",
    category: "discovery",
    description: "Handles a server that advertises no tools gracefully",
    setup: {
      server: {
        key: "empty-server",
        transport: "stdio",
        healthy: true,
        tools: [],
      },
    },
    expected: {
      discoverySuccess: true,
      toolCount: 0,
    },
  },
  {
    id: "mcp-discover-blocked-tools-filtered",
    category: "discovery",
    description: "Blocked tools are discovered but excluded from the tool set",
    setup: {
      server: {
        key: "mixed-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "safe_tool",
            description: "A safe tool",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "blocked_tool",
            description: "A dangerous tool (blocked in DB)",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
    },
    expected: {
      discoverySuccess: true,
      toolCount: 1, // blocked_tool filtered out
      registeredInCatalog: true,
    },
  },

  // --- Execution ---
  {
    id: "mcp-execute-tool-success",
    category: "execution",
    description: "Executes an MCP tool and returns parsed result",
    setup: {
      server: {
        key: "test-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "get_weather",
            description: "Get weather",
            inputSchema: {
              type: "object",
              properties: { location: { type: "string" } },
            },
          },
        ],
      },
      toolCall: {
        toolName: "get_weather",
        args: { location: "San Francisco" },
        mockResult: {
          content: JSON.stringify({ temperature: 65, condition: "foggy" }),
        },
      },
    },
    expected: {
      executionSuccess: true,
      healthStatus: "healthy",
    },
  },
  {
    id: "mcp-execute-tool-error-response",
    category: "execution",
    description: "Handles MCP tool returning isError=true",
    setup: {
      server: {
        key: "test-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "failing_tool",
            description: "Tool that returns error",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      toolCall: {
        toolName: "failing_tool",
        args: {},
        mockResult: { content: "Tool execution failed: invalid input", isError: true },
      },
    },
    expected: {
      executionSuccess: false,
      errorClass: "mcp_tool_error",
    },
  },
  {
    id: "mcp-execute-tool-json-result",
    category: "execution",
    description: "Parses JSON result from MCP tool correctly",
    setup: {
      server: {
        key: "test-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "data_tool",
            description: "Returns JSON data",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      toolCall: {
        toolName: "data_tool",
        args: {},
        mockResult: {
          content: JSON.stringify({ items: [1, 2, 3], total: 3 }),
        },
      },
    },
    expected: {
      executionSuccess: true,
    },
  },

  // --- Connection lifecycle ---
  {
    id: "mcp-connection-reuse",
    category: "connection_lifecycle",
    description: "Reuses existing connection for same server key",
    setup: {
      server: {
        key: "reuse-server",
        transport: "sse",
        healthy: true,
        tools: [
          {
            name: "tool_a",
            description: "Tool A",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
    },
    expected: {
      discoverySuccess: true,
      healthStatus: "healthy",
    },
  },
  {
    id: "mcp-reconnect-on-failure",
    category: "connection_lifecycle",
    description: "Reconnects automatically when execution finds stale connection",
    setup: {
      server: {
        key: "flaky-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "tool_a",
            description: "Tool A",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      toolCall: {
        toolName: "tool_a",
        args: {},
        connectionLost: true,
      },
    },
    expected: {
      executionSuccess: false,
      errorClass: "connection_lost",
    },
  },

  // --- Error handling ---
  {
    id: "mcp-server-unreachable",
    category: "error_handling",
    description: "Returns graceful error when server is unreachable",
    setup: {
      server: {
        key: "dead-server",
        transport: "stdio",
        healthy: false,
        tools: [],
      },
    },
    expected: {
      discoverySuccess: false,
      healthStatus: "unreachable",
    },
  },
  {
    id: "mcp-tool-execution-timeout",
    category: "error_handling",
    description: "Returns timeout error when MCP tool takes too long",
    setup: {
      server: {
        key: "slow-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "slow_tool",
            description: "Very slow tool",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      toolCall: {
        toolName: "slow_tool",
        args: {},
        timeout: true,
      },
    },
    expected: {
      executionSuccess: false,
      errorClass: "timeout",
      healthStatus: "degraded",
    },
  },
  {
    id: "mcp-invalid-tool-name",
    category: "error_handling",
    description: "Returns error when calling a tool not advertised by server",
    setup: {
      server: {
        key: "test-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "real_tool",
            description: "Real tool",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      toolCall: {
        toolName: "nonexistent_tool",
        args: {},
      },
    },
    expected: {
      executionSuccess: false,
      errorClass: "tool_not_found",
    },
  },

  // --- Health ---
  {
    id: "mcp-health-check-healthy",
    category: "health",
    description: "Health check returns healthy for responsive server",
    setup: {
      server: {
        key: "healthy-server",
        transport: "stdio",
        healthy: true,
        tools: [
          {
            name: "tool_a",
            description: "Tool A",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
    },
    expected: {
      healthStatus: "healthy",
    },
  },
  {
    id: "mcp-health-check-unreachable",
    category: "health",
    description: "Health check returns unreachable for down server",
    setup: {
      server: {
        key: "down-server",
        transport: "stdio",
        healthy: false,
        tools: [],
      },
    },
    expected: {
      healthStatus: "unreachable",
    },
  },
];

export const MCP_SCENARIO_COUNTS = {
  total: MCP_EVAL_SCENARIOS.length,
  byCategory: Object.fromEntries(
    ["discovery", "execution", "connection_lifecycle", "error_handling", "health"].map(
      (cat) => [
        cat,
        MCP_EVAL_SCENARIOS.filter((s) => s.category === cat).length,
      ]
    )
  ) as Record<string, number>,
};
