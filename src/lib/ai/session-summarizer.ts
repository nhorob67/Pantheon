import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pantheonFastModel } from "./client";
import { writeMemoryRecord } from "./memory-record-writer";
import { estimateTokens } from "./history-loader";
import { runPreCompactionFlush } from "./pre-compaction-flush";
import type { MemoryCaptureLevel } from "@/types/memory";

// Adaptive compaction: threshold scales with context window
const COMPACTION_RATIO = 0.08;
const MIN_COMPACTION_THRESHOLD = 4000;
const MAX_COMPACTION_THRESHOLD = 30000;
const DEFAULT_CONTEXT_WINDOW = 200_000;

const MIN_MESSAGES_FOR_COMPACTION = 8;
const MESSAGES_TO_SUMMARIZE = 30;
const MAX_LEAF_OUTPUT_TOKENS = 300;
const MAX_CONDENSED_OUTPUT_TOKENS = 500;
const MAX_DAG_DEPTH = 3;
const CONDENSATION_FANOUT = 4;

export function computeCompactionThreshold(contextWindowTokens?: number): number {
  const ctx = contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW;
  return Math.max(
    MIN_COMPACTION_THRESHOLD,
    Math.min(MAX_COMPACTION_THRESHOLD, Math.floor(ctx * COMPACTION_RATIO))
  );
}

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
  agentId?: string;
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
  model?: LanguageModel;
  contextWindowTokens?: number;
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

  // Estimate tokens since last summary (adaptive trigger)
  const { tokenEstimate, messageCount } = await estimateTokensSinceSummary(
    admin,
    sessionId,
    session.last_summarized_message_id
  );

  const threshold = computeCompactionThreshold(input.contextWindowTokens);
  if (tokenEstimate < threshold || messageCount < MIN_MESSAGES_FOR_COMPACTION) return;

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

  if (!messages || messages.length < MIN_MESSAGES_FOR_COMPACTION) return;

  // Cursor advances to the newest message in this batch
  const newestMessageId = messages[messages.length - 1].id;

  // Pre-compaction flush: let the agent save important details before summarization
  if (input.agentId) {
    try {
      await runPreCompactionFlush({
        admin,
        tenantId: input.tenantId,
        customerId: input.customerId,
        agentId: input.agentId,
        sessionId,
        messages,
        captureLevel,
        excludeCategories,
        model: input.model,
      });
    } catch {
      // Flush failure must not block summarization
    }
  }

  // Format for summarization
  const transcript = messages
    .filter((m) => m.content_text)
    .map((m) => {
      const role = m.direction === "inbound" ? "User" : "Assistant";
      return `${role}: ${m.content_text}`;
    })
    .join("\n");

  // Generate summary via structured output (escalation strategy: normal → aggressive → deterministic)
  let summary: string;
  let facts: Array<{ content: string; type: "fact" | "preference" | "commitment"; confidence: number }>;

  try {
    const result = await generateObject({
      model: input.model ?? pantheonFastModel,
      schema: SummarySchema,
      maxOutputTokens: MAX_LEAF_OUTPUT_TOKENS,
      temperature: 0.3,
      system:
        "You are summarizing a conversation between a user and their AI agent. Extract a concise summary and up to 5 durable facts.",
      prompt: transcript,
    });
    summary = result.object.summary;
    facts = result.object.facts;

    // Aggressive retry if summary is too short
    if (summary.length < 20) {
      const retry = await generateObject({
        model: input.model ?? pantheonFastModel,
        schema: SummarySchema,
        maxOutputTokens: Math.floor(MAX_LEAF_OUTPUT_TOKENS * 0.6),
        temperature: 0.1,
        system:
          "You are summarizing a conversation between a user and their AI agent. Extract a concise summary and up to 5 durable facts. Be thorough.",
        prompt: transcript,
      });
      if (retry.object.summary.length > summary.length) {
        summary = retry.object.summary;
        facts = retry.object.facts;
      }
    }
  } catch {
    // Deterministic fallback: truncate to first/last 2 sentences + metadata
    const lines = transcript.split("\n").filter((l) => l.trim());
    const head = lines.slice(0, 2).join(" ");
    const tail = lines.length > 2 ? lines.slice(-2).join(" ") : "";
    summary = `[auto-summary] ${head}${tail ? " ... " + tail : ""} (${messages.length} messages)`;
    facts = [];
  }

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
    // Optimistic lock failed — another process updated first, or error. Skip fact/DAG writes.
    return;
  }

  // Write DAG leaf node (depth 0) for this summary batch
  const messageIds = messages.map((m) => m.id);
  const timeStart = messages[0]?.created_at ?? null;
  const timeEnd = messages[messages.length - 1]?.created_at ?? null;

  await createLeafSummaryNode(admin, {
    sessionId,
    messageIds,
    summaryText: summary,
    tokenCount: estimateTokens(summary),
    timeStart,
    timeEnd,
  }).catch(() => {
    // DAG write failure must not block the rest of summarization
  });

  // Attempt condensation of leaf nodes
  await maybeCondenseNodes(admin, sessionId, input.model ?? pantheonFastModel).catch(() => {});

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

// ─── DAG helpers ───────────────────────────────────────────────────────────────

interface LeafNodeInput {
  sessionId: string;
  messageIds: string[];
  summaryText: string;
  tokenCount: number;
  timeStart: string | null;
  timeEnd: string | null;
}

async function createLeafSummaryNode(
  admin: SupabaseClient,
  input: LeafNodeInput
): Promise<{ id: string }> {
  const { data, error } = await admin
    .from("session_summary_nodes")
    .insert({
      session_id: input.sessionId,
      parent_node_id: null,
      depth: 0,
      summary_text: input.summaryText,
      source_message_ids: input.messageIds,
      source_node_ids: [],
      token_count: input.tokenCount,
      message_time_start: input.timeStart,
      message_time_end: input.timeEnd,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

async function maybeCondenseNodes(
  admin: SupabaseClient,
  sessionId: string,
  model: LanguageModel
): Promise<void> {
  for (let depth = 0; depth < MAX_DAG_DEPTH; depth++) {
    // Find uncondensed nodes at this depth (no parent)
    const { data: nodes } = await admin
      .from("session_summary_nodes")
      .select("id, summary_text, token_count")
      .eq("session_id", sessionId)
      .eq("depth", depth)
      .is("parent_node_id", null)
      .order("created_at", { ascending: true });

    if (!nodes || nodes.length < CONDENSATION_FANOUT) break;

    // Take the oldest batch for condensation
    const batch = nodes.slice(0, CONDENSATION_FANOUT);
    const combinedText = batch.map((n) => n.summary_text).join("\n\n---\n\n");

    let condensedSummary: string;
    try {
      const result = await generateObject({
        model,
        schema: z.object({ summary: z.string() }),
        maxOutputTokens: MAX_CONDENSED_OUTPUT_TOKENS,
        temperature: 0.3,
        system:
          "You are condensing multiple conversation summaries into a single higher-level summary. Preserve key facts, decisions, and commitments. Be concise.",
        prompt: combinedText,
      });
      condensedSummary = result.object.summary;
    } catch {
      // Deterministic fallback
      condensedSummary = `[condensed] ${batch.map((n) => n.summary_text.slice(0, 80)).join(" | ")}`;
    }

    const childIds = batch.map((n) => n.id);

    // Insert parent node
    const { data: parent, error: insertErr } = await admin
      .from("session_summary_nodes")
      .insert({
        session_id: sessionId,
        parent_node_id: null,
        depth: depth + 1,
        summary_text: condensedSummary,
        source_message_ids: [],
        source_node_ids: childIds,
        token_count: estimateTokens(condensedSummary),
        message_time_start: null,
        message_time_end: null,
      })
      .select("id")
      .single();

    if (insertErr || !parent) break;

    // Link children to parent
    await admin
      .from("session_summary_nodes")
      .update({ parent_node_id: parent.id })
      .in("id", childIds);

    // Update rolling_summary cache with highest-level condensed summary
    await admin
      .from("tenant_sessions")
      .update({ rolling_summary: condensedSummary })
      .eq("id", sessionId);
  }
}

async function estimateTokensSinceSummary(
  admin: SupabaseClient,
  sessionId: string,
  lastSummarizedMessageId: string | null
): Promise<{ tokenEstimate: number; messageCount: number }> {
  let query = admin
    .from("tenant_messages")
    .select("id, content_text")
    .eq("session_id", sessionId);

  if (lastSummarizedMessageId) {
    const { data: refMsg } = await admin
      .from("tenant_messages")
      .select("created_at, id")
      .eq("id", lastSummarizedMessageId)
      .maybeSingle();

    if (refMsg) {
      query = query.or(
        `created_at.gt.${refMsg.created_at},and(created_at.eq.${refMsg.created_at},id.gt.${refMsg.id})`
      );
    }
    // If refMsg deleted, query returns all messages (same as no cursor)
  }

  const { data } = await query;
  const messages = data ?? [];

  let tokenEstimate = 0;
  for (const msg of messages) {
    if (msg.content_text) {
      tokenEstimate += estimateTokens(msg.content_text);
    }
  }

  return { tokenEstimate, messageCount: messages.length };
}
