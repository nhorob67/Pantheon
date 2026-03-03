import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { farmclawModel } from "./client";
import { writeMemoryRecord } from "./memory-record-writer";
import type { MemoryCaptureLevel } from "@/types/memory";

const SUMMARY_THRESHOLD = 20;
const MESSAGES_TO_SUMMARIZE = 30;
const MAX_OUTPUT_TOKENS = 300;

const SummarySchema = z.object({
  summary: z.string(),
  facts: z
    .array(
      z.object({
        content: z.string(),
        type: z.enum(["fact", "preference", "commitment"]),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(5),
});

export interface SummarizeInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  sessionId: string;
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
}

/**
 * Check if a session needs summarization and generate one if so.
 * Non-blocking — caller should fire-and-forget.
 */
export async function maybeGenerateSummary(input: SummarizeInput): Promise<void> {
  const { admin, sessionId } = input;
  const captureLevel = input.captureLevel ?? "standard";
  const excludeCategories = input.excludeCategories ?? [];

  // Load session to check summary state
  const { data: session, error: sessionError } = await admin
    .from("tenant_sessions")
    .select("id, rolling_summary, summary_version, last_message_at, last_summarized_message_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) return;

  // Count messages since last summary using exact cursor
  const messagesSince = await countMessagesSinceSummary(
    admin,
    sessionId,
    session.last_summarized_message_id
  );

  if (messagesSince < SUMMARY_THRESHOLD) return;

  // Load oldest unsummarized messages (starting after cursor) so we don't skip backlogs.
  // Uses composite (created_at, id) ordering for deterministic tie-breaking.
  let query = admin
    .from("tenant_messages")
    .select("id, direction, author_type, content_text, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(MESSAGES_TO_SUMMARIZE);

  // If we have a cursor, only fetch messages strictly after it
  if (session.last_summarized_message_id) {
    const { data: refMsg } = await admin
      .from("tenant_messages")
      .select("created_at, id")
      .eq("id", session.last_summarized_message_id)
      .maybeSingle();
    if (refMsg) {
      // Composite cursor: messages with later timestamp, OR same timestamp but higher ID
      query = query.or(
        `created_at.gt.${refMsg.created_at},and(created_at.eq.${refMsg.created_at},id.gt.${refMsg.id})`
      );
    }
  }

  const { data: messages } = await query;

  if (!messages || messages.length < SUMMARY_THRESHOLD) return;

  // Cursor advances to the newest message in this batch
  const newestMessageId = messages[messages.length - 1].id;

  // Format for summarization
  const transcript = messages
    .filter((m) => m.content_text)
    .map((m) => {
      const role = m.direction === "inbound" ? "Farmer" : "Assistant";
      return `${role}: ${m.content_text}`;
    })
    .join("\n");

  // Generate summary via structured output
  const result = await generateObject({
    model: farmclawModel,
    schema: SummarySchema,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.3,
    system:
      "You are summarizing a conversation between a farmer and their AI farm assistant. Extract a concise summary and up to 5 durable facts.",
    prompt: transcript,
  });

  const summary = result.object.summary;
  const facts = result.object.facts;

  // Update session with optimistic locking
  const { data: updatedRows, error: updateError } = await admin
    .from("tenant_sessions")
    .update({
      rolling_summary: summary,
      summary_version: session.summary_version + 1,
      last_summarized_message_id: newestMessageId,
    })
    .eq("id", sessionId)
    .eq("summary_version", session.summary_version)
    .select("id");

  if (updateError || !updatedRows || updatedRows.length === 0) {
    // Optimistic lock failed — another process updated first, or error. Skip fact writes.
    return;
  }

  // Store durable facts through the shared write pipeline
  for (const fact of facts) {
    try {
      await writeMemoryRecord({
        admin,
        tenantId: input.tenantId,
        customerId: input.customerId,
        sessionId: input.sessionId,
        content: fact.content,
        memoryType: fact.type,
        confidence: fact.confidence,
        source: "system",
        captureLevel,
        excludeCategories,
      });
    } catch {
      // Skip individual fact failures
    }
  }
}

async function countMessagesSinceSummary(
  admin: SupabaseClient,
  sessionId: string,
  lastSummarizedMessageId: string | null
): Promise<number> {
  if (!lastSummarizedMessageId) {
    // No summary yet — count all messages
    const { count } = await admin
      .from("tenant_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    return count ?? 0;
  }

  // Get the timestamp + id of the last summarized message for composite cursor
  const { data: refMsg } = await admin
    .from("tenant_messages")
    .select("created_at, id")
    .eq("id", lastSummarizedMessageId)
    .maybeSingle();

  if (!refMsg) {
    // Reference message was deleted — fall back to full count
    const { count } = await admin
      .from("tenant_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    return count ?? 0;
  }

  // Count messages strictly after the cursor (composite tie-break on id)
  const { count } = await admin
    .from("tenant_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .or(
      `created_at.gt.${refMsg.created_at},and(created_at.eq.${refMsg.created_at},id.gt.${refMsg.id})`
    );

  return count ?? 0;
}
