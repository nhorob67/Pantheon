import type { Agent } from "@/types/agent";

interface KnowledgeFileRow {
  id: string;
  agent_id: string | null;
  file_name: string;
  parsed_markdown: string;
}

interface KnowledgePayload {
  shared: Record<string, string>;
  agents: Record<string, Record<string, string>>;
}

/**
 * Organizes knowledge files into shared/ and agents/{key}/ buckets
 * for transport to the container via KNOWLEDGE_FILES env var.
 */
export function buildKnowledgePayload(
  files: KnowledgeFileRow[],
  agents: Agent[]
): KnowledgePayload {
  const agentKeyMap = new Map(agents.map((a) => [a.id, a.agent_key]));

  const payload: KnowledgePayload = { shared: {}, agents: {} };

  for (const file of files) {
    // Convert file_name to a safe .md filename
    const mdName = toMdFilename(file.file_name);

    if (!file.agent_id) {
      payload.shared[mdName] = file.parsed_markdown;
    } else {
      const agentKey = agentKeyMap.get(file.agent_id);
      if (!agentKey) {
        // Agent was deleted — ON DELETE SET NULL promotes to shared
        payload.shared[mdName] = file.parsed_markdown;
        continue;
      }
      if (!payload.agents[agentKey]) {
        payload.agents[agentKey] = {};
      }
      payload.agents[agentKey][mdName] = file.parsed_markdown;
    }
  }

  return payload;
}

/** Convert any filename to a safe .md filename */
function toMdFilename(name: string): string {
  // Strip original extension, add .md
  const base = name.replace(/\.[^.]+$/, "");
  // Sanitize: lowercase, replace spaces/special chars with hyphens
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "document"}.md`;
}
