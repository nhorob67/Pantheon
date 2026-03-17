/**
 * MCP tool key naming utilities.
 *
 * Extracted into a standalone file with no external dependencies so it can
 * be tested directly by Node's test runner without path alias resolution.
 */

/**
 * Build the canonical tool key for an MCP tool.
 * Convention: `mcp.{server_key}.{tool_name}`
 */
export function toMcpToolKey(serverKey: string, toolName: string): string {
  const normalizedName = toolName
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "")
    .slice(0, 100);
  return `mcp.${serverKey}.${normalizedName}`;
}

/**
 * Parse an MCP tool key back to server_key and tool_name.
 */
export function parseMcpToolKey(toolKey: string): { serverKey: string; toolName: string } | null {
  if (!toolKey.startsWith("mcp.")) return null;
  const rest = toolKey.slice(4);
  const dotIndex = rest.indexOf(".");
  if (dotIndex < 0) return null;
  return {
    serverKey: rest.slice(0, dotIndex),
    toolName: rest.slice(dotIndex + 1),
  };
}
