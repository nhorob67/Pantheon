/**
 * Builds dynamic tool documentation from the actual resolved tool names.
 * Injected into the system prompt so the model knows exactly which tools
 * are available — no stale hardcoded lists.
 *
 * Uses NATIVE_TOOL_CATALOG for descriptions of native tools. Non-catalog
 * tools (Composio, MCP) are rendered name-only — their names are descriptive.
 */

import { NATIVE_TOOL_CATALOG } from "../runtime/tool-catalog.ts";

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

interface CategoryConfig {
  label: string;
  summary: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  memory: { label: "Memory", summary: "Save and retrieve long-term information" },
  schedule: { label: "Schedules", summary: "Create and manage recurring tasks" },
  "self-config": { label: "Self-Configuration", summary: "View and update agent and team settings" },
  credentials: { label: "Credentials", summary: "Access stored secrets and API keys" },
  network: { label: "Network", summary: "Make HTTP requests and search the web" },
  delegation: { label: "Delegation", summary: "Hand off tasks to other agents on the team" },
  browser: { label: "Browser", summary: "Navigate and interact with web pages" },
  "file-creation": { label: "File Creation", summary: "Generate and deliver files as Discord attachments" },
};

const CATEGORY_ORDER = [
  "memory",
  "schedule",
  "self-config",
  "credentials",
  "network",
  "delegation",
  "browser",
  "file-creation",
] as const;

// ---------------------------------------------------------------------------
// Categorization
// ---------------------------------------------------------------------------

function categorize(toolName: string): string | null {
  // Check native catalog first
  const catalogEntry = NATIVE_TOOL_CATALOG.get(toolName);
  if (catalogEntry) return catalogEntry.category;

  // Fallback prefix matching for non-catalog tools
  if (toolName.startsWith("composio_")) return "composio";
  if (toolName.startsWith("mcp_")) return "mcp";

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildToolDocumentation(toolNames: string[]): string {
  if (toolNames.length === 0) return "";

  const grouped = new Map<string, Array<{ name: string; description: string | null }>>();
  const uncategorized: Array<{ name: string; description: string | null }> = [];

  for (const name of toolNames) {
    const catalogEntry = NATIVE_TOOL_CATALOG.get(name);
    const category = categorize(name);
    const description = catalogEntry?.description ?? null;

    if (category) {
      const list = grouped.get(category) ?? [];
      list.push({ name, description });
      grouped.set(category, list);
    } else {
      uncategorized.push({ name, description });
    }
  }

  const lines: string[] = [
    "## Your Capabilities",
    "",
    "You have the following tools available. When a user asks you to do something",
    "covered by these tools, use the tool. Do not claim you cannot do it.",
    "",
    "**IMPORTANT: Call tools immediately when needed. Never narrate what you plan to do without also doing it. If you catch yourself saying \"let me check\" without a tool call, stop and call the tool instead.**",
    "",
  ];

  for (const category of CATEGORY_ORDER) {
    const tools = grouped.get(category);
    if (!tools || tools.length === 0) continue;

    const config = CATEGORY_CONFIG[category];
    if (config) {
      lines.push(`**${config.label}** — ${config.summary}`);
    } else {
      lines.push(`**${category}**`);
    }

    for (const t of tools) {
      if (t.description) {
        lines.push(`- \`${t.name}\` — ${t.description}`);
      } else {
        lines.push(`- \`${t.name}\``);
      }
    }
    lines.push("");
  }

  // Composio and MCP tools — render grouped by prefix with name-only
  const composioTools = grouped.get("composio");
  if (composioTools && composioTools.length > 0) {
    lines.push(`**Integrations** — Third-party service integrations`);
    for (const t of composioTools) {
      lines.push(`- \`${t.name}\``);
    }
    lines.push("");
  }

  const mcpTools = grouped.get("mcp");
  if (mcpTools && mcpTools.length > 0) {
    lines.push(`**MCP Servers** — Custom tool servers`);
    for (const t of mcpTools) {
      lines.push(`- \`${t.name}\``);
    }
    lines.push("");
  }

  if (uncategorized.length > 0) {
    lines.push(`**Other**`);
    for (const t of uncategorized) {
      if (t.description) {
        lines.push(`- \`${t.name}\` — ${t.description}`);
      } else {
        lines.push(`- \`${t.name}\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
