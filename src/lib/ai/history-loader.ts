import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import type { TenantMessage } from "@/types/tenant-runtime";

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_ESTIMATED_TOKENS = 8000;
const OVERLAP_TOKEN_BUDGET = 500;

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function messageToCore(msg: TenantMessage): ModelMessage[] {
  if (msg.direction === "inbound" && msg.content_text) {
    return [{ role: "user", content: msg.content_text }];
  }
  if (msg.direction === "outbound") {
    // Multi-step responses: return stored AI SDK messages directly
    const storedMessages = msg.content_json?.tool_calls;
    if (Array.isArray(storedMessages) && storedMessages.length > 0) {
      const valid = storedMessages.filter(
        (m: Record<string, unknown>) => m.role === "assistant" || m.role === "tool"
      );
      if (valid.length > 0) return valid as ModelMessage[];
    }
    if (msg.content_text) {
      return [{ role: "assistant", content: msg.content_text }];
    }
  }
  // Legacy tool rows (direction="tool") — text fallback
  if (msg.direction === "tool" && msg.content_json) {
    const json = msg.content_json;
    const toolName = typeof json.tool_name === "string" ? json.tool_name : "unknown";
    const result = json.result ? JSON.stringify(json.result) : "{}";
    return [{
      role: "assistant",
      content: `[Tool: ${toolName}] ${result}`,
    }];
  }
  return [];
}

export async function loadConversationHistory(
  admin: SupabaseClient,
  sessionId: string,
  options?: {
    limit?: number;
    maxTokens?: number;
    overlapTokens?: number;
  }
): Promise<ModelMessage[]> {
  const limit = options?.limit ?? DEFAULT_MESSAGE_LIMIT;
  const maxTokens = options?.maxTokens ?? MAX_ESTIMATED_TOKENS;
  const overlapTokens = options?.overlapTokens ?? OVERLAP_TOKEN_BUDGET;

  const { data, error } = await admin
    .from("tenant_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load conversation history: ${error.message}`);
  }

  const rows = (data || []) as TenantMessage[];
  // Reverse to chronological order
  rows.reverse();

  // Convert to ModelMessage format with token budget
  let tokenBudget = maxTokens;

  // Add messages from most recent backward until budget is exhausted
  const converted: ModelMessage[] = [];
  let mainCutoffIndex = -1;

  for (let i = rows.length - 1; i >= 0; i--) {
    const coreMessages = messageToCore(rows[i]);
    if (coreMessages.length === 0) continue;

    // Estimate tokens for all messages in this group
    let groupTokens = 0;
    for (const core of coreMessages) {
      const text = typeof core.content === "string" ? core.content : JSON.stringify(core.content);
      groupTokens += estimateTokens(text);
    }

    if (tokenBudget - groupTokens < 0 && converted.length > 0) {
      mainCutoffIndex = i;
      break;
    }

    tokenBudget -= groupTokens;
    converted.unshift(...coreMessages);
  }

  // Overlap: load additional older messages beyond main cutoff
  if (overlapTokens > 0 && mainCutoffIndex >= 0) {
    let overlapBudget = overlapTokens;
    const overlapMessages: ModelMessage[] = [];

    for (let i = mainCutoffIndex; i >= 0; i--) {
      const coreMessages = messageToCore(rows[i]);
      if (coreMessages.length === 0) continue;

      let groupTokens = 0;
      for (const core of coreMessages) {
        const text = typeof core.content === "string" ? core.content : JSON.stringify(core.content);
        groupTokens += estimateTokens(text);
      }

      if (overlapBudget - groupTokens < 0 && overlapMessages.length > 0) break;

      overlapBudget -= groupTokens;
      overlapMessages.unshift(...coreMessages);
    }

    // Ensure oldest loaded message starts on a user role boundary
    if (overlapMessages.length > 0 && overlapMessages[0].role !== "user") {
      // Walk back one more row to find preceding user message
      const firstOverlapIdx = rows.findIndex((r) => {
        const core = messageToCore(r);
        return core.length > 0 && core[0] === overlapMessages[0];
      });
      if (firstOverlapIdx > 0) {
        for (let i = firstOverlapIdx - 1; i >= 0; i--) {
          const coreMessages = messageToCore(rows[i]);
          if (coreMessages.length === 0) continue;
          if (coreMessages[0].role === "user") {
            overlapMessages.unshift(...coreMessages);
            break;
          }
          break; // Only walk back one non-empty message
        }
      }
    }

    converted.unshift(...overlapMessages);
  }

  return converted;
}
