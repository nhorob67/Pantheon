import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pantheonFastModel } from "./client";
import { writeMemoryRecord } from "./memory-record-writer";
import { estimateTokens } from "./history-loader";
import { runPreCompactionFlush } from "./pre-compaction-flush";
import { generateDeterministicSummary } from "./deterministic-compaction";
import type { MemoryCaptureLevel } from "@/types/memory";

const TOKEN_COMPACTION_THRESHOLD = 6000;
const MIN_MESSAGES_FOR_COMPACTION = 8;
const MESSAGES_TO_SUMMARIZE = 30;
const MAX_OUTPUT_TOKENS = 300;

/** Number of depth-0 children before we roll them up into a parent */
const ROLLUP_THRESHOLD = 5;

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

const RollupSchema = z.object({
  summary: z.string(),
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
}

export interface SummaryNode {
  id: string;
  parent_id: string | null;
  depth: number;
  summary_text: string;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  child_count: number;
  created_at: string;
}

/**
 * Check if a session needs summarization and generate one if so.
 * Builds a hierarchical summary DAG: leaf nodes summarize message batches,
 * parent nodes summarize groups of children. Non-blocking — caller should fire-and-forget.
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

  if (tokenEstimate < TOKEN_COMPACTION_THRESHOLD || messageCount < MIN_MESSAGES_FOR_COMPACTION) return;

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

  // Generate summary via LLM with deterministic fallback
  let summary: string;
  let facts: Array<{ content: string; type: "fact" | "preference" | "commitment"; confidence: number }>;

  try {
    const result = await generateObject({
      model: input.model ?? pantheonFastModel,
      schema: SummarySchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      system:
        "You are summarizing a conversation between a user and their AI agent. Extract a concise summary and up to 5 durable facts.",
      prompt: transcript,
    });
    summary = result.object.summary;
    facts = result.object.facts;
  } catch {
    // Deterministic fallback: extract summary without LLM
    const fallback = generateDeterministicSummary(
      messages.filter((m) => m.content_text).map((m) => ({
        direction: m.direction as "inbound" | "outbound",
        content_text: m.content_text,
        created_at: m.created_at,
      }))
    );
    summary = fallback.summary;
    facts = fallback.facts;
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
    // Optimistic lock failed — another process updated first, or error. Skip writes.
    return;
  }

  // Insert a summary DAG leaf node
  const firstMsgAt = messages[0]?.created_at ?? null;
  const lastMsgAt = messages[messages.length - 1]?.created_at ?? null;

  const { data: leafNode } = await admin
    .from("tenant_summary_nodes")
    .insert({
      tenant_id: input.tenantId,
      session_id: sessionId,
      parent_id: null,
      depth: 0,
      summary_text: summary,
      message_count: messages.length,
      first_message_at: firstMsgAt,
      last_message_at: lastMsgAt,
      child_count: 0,
    })
    .select("id")
    .single();

  if (leafNode) {
    // Update session pointer to the latest leaf
    await admin
      .from("tenant_sessions")
      .update({ current_summary_node_id: leafNode.id })
      .eq("id", sessionId);

    // Check if we need to roll up orphan leaves into a parent
    await maybeRollUpSummaries(admin, input.tenantId, sessionId, input.model);
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

/**
 * Roll up orphan (parentless) summary nodes at a given depth into a parent node
 * when ROLLUP_THRESHOLD is reached. This builds the hierarchical DAG.
 */
export async function maybeRollUpSummaries(
  admin: SupabaseClient,
  tenantId: string,
  sessionId: string,
  model?: LanguageModel,
  depth: number = 0
): Promise<void> {
  // Find orphan nodes at this depth (no parent)
  const { data: orphans } = await admin
    .from("tenant_summary_nodes")
    .select("id, summary_text, message_count, first_message_at, last_message_at")
    .eq("session_id", sessionId)
    .eq("depth", depth)
    .is("parent_id", null)
    .order("created_at", { ascending: true });

  if (!orphans || orphans.length < ROLLUP_THRESHOLD) return;

  // Take the oldest ROLLUP_THRESHOLD nodes to merge
  const toMerge = orphans.slice(0, ROLLUP_THRESHOLD);

  const childSummaries = toMerge.map((n) => n.summary_text).join("\n\n---\n\n");
  const totalMessages = toMerge.reduce((sum, n) => sum + (n.message_count ?? 0), 0);
  const firstAt = toMerge[0]?.first_message_at ?? null;
  const lastAt = toMerge[toMerge.length - 1]?.last_message_at ?? null;

  // Generate parent summary via LLM with deterministic fallback
  let parentSummary: string;
  try {
    const result = await generateObject({
      model: model ?? pantheonFastModel,
      schema: RollupSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      system:
        "You are condensing multiple conversation summaries into one higher-level summary. Preserve key facts, decisions, and commitments. Be concise.",
      prompt: `Condense these ${toMerge.length} conversation summaries into a single higher-level summary:\n\n${childSummaries}`,
    });
    parentSummary = result.object.summary;
  } catch {
    // Deterministic fallback: concatenate truncated children
    const truncated = toMerge.map(
      (n) => n.summary_text.slice(0, 200) + (n.summary_text.length > 200 ? "..." : "")
    );
    parentSummary = `[Consolidated summary of ${toMerge.length} conversation segments covering ${totalMessages} messages] ${truncated.join(" | ")}`;
  }

  // Insert parent node
  const { data: parentNode } = await admin
    .from("tenant_summary_nodes")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      parent_id: null,
      depth: depth + 1,
      summary_text: parentSummary,
      message_count: totalMessages,
      first_message_at: firstAt,
      last_message_at: lastAt,
      child_count: toMerge.length,
    })
    .select("id")
    .single();

  if (!parentNode) return;

  // Link children to parent
  const childIds = toMerge.map((n) => n.id);
  await admin
    .from("tenant_summary_nodes")
    .update({ parent_id: parentNode.id })
    .in("id", childIds);

  // Recurse: check if the next depth level also needs rollup
  await maybeRollUpSummaries(admin, tenantId, sessionId, model, depth + 1);
}

/**
 * Retrieve the summary DAG for a session, optionally drilling into a specific node's children.
 */
export async function getSummaryDAG(
  admin: SupabaseClient,
  sessionId: string,
  parentId?: string | null,
  depth?: number
): Promise<SummaryNode[]> {
  let query = admin
    .from("tenant_summary_nodes")
    .select("id, parent_id, depth, summary_text, message_count, first_message_at, last_message_at, child_count, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (parentId !== undefined) {
    if (parentId === null) {
      // Get root nodes (no parent) at a specific depth
      query = query.is("parent_id", null);
    } else {
      // Get children of a specific parent
      query = query.eq("parent_id", parentId);
    }
  }

  if (depth !== undefined) {
    query = query.eq("depth", depth);
  }

  const { data } = await query;
  return (data ?? []) as SummaryNode[];
}

/**
 * Get the highest-level summary chain for context assembly.
 * Returns root nodes (highest depth, no parent) for the session.
 */
export async function getTopLevelSummaries(
  admin: SupabaseClient,
  sessionId: string,
  limit: number = 3
): Promise<SummaryNode[]> {
  // Get the max depth for this session
  const { data: nodes } = await admin
    .from("tenant_summary_nodes")
    .select("id, parent_id, depth, summary_text, message_count, first_message_at, last_message_at, child_count, created_at")
    .eq("session_id", sessionId)
    .is("parent_id", null)
    .order("depth", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (nodes ?? []) as SummaryNode[];
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
