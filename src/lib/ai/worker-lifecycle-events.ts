/**
 * Worker lifecycle event extraction.
 *
 * Detects delegation and file-ready events from tool results emitted
 * during an agent turn.
 */

export function shouldSuppressIntermediateToolPreamble(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 160) return false;
  if (/\d/.test(trimmed) || /https?:\/\//i.test(trimmed)) return false;

  return /^(let me|i('| wi)?ll|i am|i'm)\s+(check|look|look up|pull|review|try|see|fetch|read)\b/i.test(trimmed);
}

function pickLifecycleString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

export type WorkerLifecycleToolEvent =
  | {
      type: "delegation_started";
      dedupeKey: string;
      message: string;
      targetAgentName?: string;
    }
  | {
      type: "file_ready";
      dedupeKey: string;
      message: string;
      fileName: string;
    };

export function extractWorkerLifecycleToolEvents(step: {
  toolResults?: Array<{
    toolName?: string;
    result?: unknown;
  }>;
}): WorkerLifecycleToolEvent[] {
  const events: WorkerLifecycleToolEvent[] = [];
  const seen = new Set<string>();

  for (const toolResult of step.toolResults ?? []) {
    const toolName =
      toolResult && typeof toolResult.toolName === "string" ? toolResult.toolName : null;
    const result =
      toolResult?.result && typeof toolResult.result === "object" && !Array.isArray(toolResult.result)
        ? (toolResult.result as Record<string, unknown>)
        : null;

    if (!toolName || !result || result.success !== true) {
      continue;
    }

    if (toolName === "delegate_task" || toolName === "delegate_task_async") {
      const targetAgentName = pickLifecycleString(result.agent_name ?? result.target_agent);
      const dedupeKey = `delegation_started:${targetAgentName ?? toolName}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      events.push({
        type: "delegation_started",
        dedupeKey,
        message: targetAgentName
          ? `I've asked ${targetAgentName} to help with that part.`
          : "I've asked another agent to help with that part.",
        targetAgentName: targetAgentName ?? undefined,
      });
      continue;
    }

    if (toolName === "file_create") {
      const fileName = pickLifecycleString(result.file_name);
      if (!fileName) {
        continue;
      }

      const dedupeKey = `file_ready:${fileName}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      events.push({
        type: "file_ready",
        dedupeKey,
        message: `I've prepared ${fileName}. I'll attach it with the result.`,
        fileName,
      });
    }
  }

  return events;
}
