import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pantheonFastModel } from "./client";
import { writeMemoryRecord } from "./memory-record-writer";

const DAILY_LOG_MAX_MESSAGES = 50;
const MAX_OUTPUT_TOKENS = 300;

const DailyLogSchema = z.object({
  summary: z.string().describe("A concise summary of the day's activity"),
  topics: z.array(z.string()).describe("Key topics discussed"),
  message_count: z.number().describe("Number of messages processed"),
  agents_active: z.array(z.string()).describe("Agent display names that were active"),
});

export async function generateDailyLog(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  date: string,
  model?: LanguageModel
): Promise<{ written: boolean }> {
  // Query tenant_messages for the given date
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: messages, error } = await admin
    .from("tenant_messages")
    .select("id, direction, content_text, author_type, created_at, session_id")
    .eq("tenant_id", tenantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("created_at", { ascending: true })
    .limit(DAILY_LOG_MAX_MESSAGES);

  if (error || !messages || messages.length === 0) {
    return { written: false };
  }

  // Build transcript
  const transcript = messages
    .filter((m) => m.content_text)
    .map((m) => {
      const role = m.direction === "inbound" ? "User" : "Assistant";
      return `${role}: ${m.content_text}`;
    })
    .join("\n");

  if (!transcript.trim()) {
    return { written: false };
  }

  // Look up active agents for the day
  const sessionIds = [...new Set(messages.map((m) => m.session_id).filter(Boolean))];
  let agentNames: string[] = [];
  if (sessionIds.length > 0) {
    const { data: sessions } = await admin
      .from("tenant_sessions")
      .select("agent_id")
      .in("id", sessionIds);

    const agentIds = [...new Set((sessions ?? []).map((s) => s.agent_id).filter(Boolean))];
    if (agentIds.length > 0) {
      const { data: agents } = await admin
        .from("tenant_agents")
        .select("display_name")
        .in("id", agentIds);

      agentNames = (agents ?? []).map((a) => a.display_name).filter(Boolean);
    }
  }

  const result = await generateObject({
    model: model ?? pantheonFastModel,
    schema: DailyLogSchema,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    system:
      "You are generating a daily activity log for an AI agent team. Summarize what happened, key topics, and who was active. Be concise and factual.",
    prompt: `Date: ${date}\nMessages: ${messages.length}\nActive agents: ${agentNames.join(", ") || "unknown"}\n\n${transcript}`,
  });

  const log = result.object;

  // Content includes date for dedup hash uniqueness
  const content = `Daily log for ${date}: ${log.summary}\nTopics: ${log.topics.join(", ")}\nMessages: ${log.message_count}\nAgents: ${log.agents_active.join(", ")}`;

  const writeResult = await writeMemoryRecord({
    admin,
    tenantId,
    customerId,
    sessionId: null,
    content,
    memoryType: "daily_log",
    confidence: 0.95,
    source: "system",
  });

  return { written: writeResult.ok };
}
