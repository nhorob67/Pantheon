/**
 * Builds dynamic tool documentation from the actual resolved tool names.
 * Injected into the system prompt so the model knows exactly which tools
 * are available — no stale hardcoded lists.
 */

const CATEGORY_ORDER = [
  "Memory",
  "Schedules",
  "Self-Configuration",
  "Credentials",
  "HTTP",
  "Integrations",
] as const;

const PREFIX_TO_CATEGORY: Record<string, (typeof CATEGORY_ORDER)[number]> = {
  memory_: "Memory",
  schedule_: "Schedules",
  config_: "Self-Configuration",
  credential_: "Credentials",
  http_: "HTTP",
  composio_: "Integrations",
};

function categorize(toolName: string): (typeof CATEGORY_ORDER)[number] | null {
  for (const [prefix, category] of Object.entries(PREFIX_TO_CATEGORY)) {
    if (toolName.startsWith(prefix)) return category;
  }
  return null;
}

export function buildToolDocumentation(toolNames: string[]): string {
  if (toolNames.length === 0) return "";

  const grouped = new Map<string, string[]>();
  const uncategorized: string[] = [];

  for (const name of toolNames) {
    const category = categorize(name);
    if (category) {
      const list = grouped.get(category) ?? [];
      list.push(name);
      grouped.set(category, list);
    } else {
      uncategorized.push(name);
    }
  }

  const lines: string[] = [
    "## Your Tools",
    "",
    "When a user asks you to do something or look something up, call the appropriate tool immediately. Do not say you will check — just call the tool.",
    "",
  ];

  for (const category of CATEGORY_ORDER) {
    const tools = grouped.get(category);
    if (!tools || tools.length === 0) continue;
    lines.push(`**${category}:** ${tools.map((t) => `\`${t}\``).join(", ")}`);
  }

  if (uncategorized.length > 0) {
    lines.push(
      `**Other:** ${uncategorized.map((t) => `\`${t}\``).join(", ")}`
    );
  }

  return lines.join("\n");
}
