export interface McpServerConfig {
  id: string;
  instance_id: string;
  customer_id: string;
  server_key: string;
  display_name: string;
  command: string;
  args: string[];
  env_vars: Record<string, string>;
  scope: "instance" | "agent";
  agent_id: string | null;
  enabled: boolean;
  transport: "stdio" | "sse";
  url: string | null;
  headers: Record<string, string>;
  health_status: McpHealthStatus;
  last_health_check: string | null;
  last_error: string | null;
  tools_discovered_at: string | null;
  tool_count: number;
  created_at: string;
  updated_at: string;
}

export type McpHealthStatus = "unknown" | "healthy" | "degraded" | "unhealthy" | "unreachable";

export interface McpServerDefinition {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface RemoteMcpServerDefinition {
  url: string;
  transport: "sse";
  headers?: Record<string, string>;
}

export type McpServerEntry = McpServerDefinition | RemoteMcpServerDefinition;

export interface McpDiscoveredTool {
  id: string;
  server_id: string;
  tenant_id: string;
  customer_id: string;
  tool_name: string;
  display_name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
  blocked: boolean;
  risk_level_override: string | null;
  discovered_at: string;
  updated_at: string;
}

export interface McpToolExecutionResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export const MCP_PRESET_KEYS = ["filesystem", "github"] as const;
export type McpPresetKey = (typeof MCP_PRESET_KEYS)[number];

export interface McpPreset {
  label: string;
  description: string;
  transport: "stdio" | "sse";
  command: string;
  args: string[];
}

export const MCP_PRESET_INFO: Record<McpPresetKey, McpPreset> = {
  filesystem: {
    label: "Filesystem",
    description: "Read, write, and manage files in a workspace directory",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
  },
  github: {
    label: "GitHub",
    description: "Interact with GitHub repositories, issues, and pull requests",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
  },
};
