import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import type { TenantMessage } from "@/types/tenant-runtime";

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_ESTIMATED_TOKENS = 8000;

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function messageToCore(msg: TenantMessage): ModelMessage | null {
  if (msg.direction === "inbound" && msg.content_text) {
    return { role: "user", content: msg.content_text };
  }
  if (msg.direction === "outbound" && msg.content_text) {
    return { role: "assistant", content: msg.content_text };
  }
  // Tool messages and system messages are included as assistant messages
  // with tool content for now; we'll refine in Phase 4 with real tool calls
  if (msg.direction === "tool" && msg.content_json) {
    const json = msg.content_json;
    const toolName = typeof json.tool_name === "string" ? json.tool_name : "unknown";
    const result = json.result ? JSON.stringify(json.result) : "{}";
    return {
      role: "assistant",
      content: `[Tool: ${toolName}] ${result}`,
    };
  }
  return null;
}

export async function loadConversationHistory(
  admin: SupabaseClient,
  sessionId: string,
  options?: {
    limit?: number;
    maxTokens?: number;
  }
): Promise<ModelMessage[]> {
  const limit = options?.limit ?? DEFAULT_MESSAGE_LIMIT;
  const maxTokens = options?.maxTokens ?? MAX_ESTIMATED_TOKENS;

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
  const messages: ModelMessage[] = [];
  let tokenBudget = maxTokens;

  // Add messages from most recent backward until budget is exhausted
  const converted: ModelMessage[] = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const core = messageToCore(rows[i]);
    if (!core) continue;

    const text = typeof core.content === "string" ? core.content : JSON.stringify(core.content);
    const tokens = estimateTokens(text);
    if (tokenBudget - tokens < 0 && converted.length > 0) break;

    tokenBudget -= tokens;
    converted.unshift(core);
  }

  messages.push(...converted);
  return messages;
}
