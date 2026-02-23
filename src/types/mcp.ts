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
  created_at: string;
  updated_at: string;
}

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

export const MCP_PRESET_KEYS = ["filesystem", "sqlite", "memory"] as const;
export type McpPresetKey = (typeof MCP_PRESET_KEYS)[number];

export const MCP_PRESET_INFO: Record<
  McpPresetKey,
  {
    label: string;
    description: string;
    command: string;
    args: string[];
  }
> = {
  filesystem: {
    label: "Filesystem",
    description: "Read and write files in the workspace directory",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/node/workspace"],
  },
  sqlite: {
    label: "SQLite",
    description: "Query and manage a local SQLite database",
    command: "npx",
    args: ["-y", "mcp-sqlite", "/home/node/data/farmclaw.db"],
  },
  memory: {
    label: "Memory",
    description: "Persistent key-value memory across conversations",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
};
