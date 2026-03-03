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

export const MCP_PRESET_KEYS = [] as const;
export type McpPresetKey = (typeof MCP_PRESET_KEYS)[number];
export const MCP_PRESET_INFO = {} as Record<
  McpPresetKey,
  {
    label: string;
    description: string;
    command: string;
    args: string[];
  }
>;
