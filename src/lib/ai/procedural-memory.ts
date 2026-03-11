import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pantheonFastModel } from "./client";

const patternSchema = z.object({
  patterns: z.array(
    z.object({
      content: z.string().describe("The behavioral pattern observed"),
      pattern_type: z.enum(["routine", "preference", "seasonal", "workflow"]),
      trigger_condition: z
        .string()
        .describe("When this pattern is relevant (e.g., 'Monday morning', 'planting season')"),
      confidence: z.number().min(0).max(1),
    })
  ),
});

const MIN_MESSAGES_FOR_EXTRACTION = 10;

export async function extractBehavioralPatterns(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    sessionId: string;
    recentMessages: Array<{ role: string; content: string }>;
    existingPatterns: string[];
    model?: LanguageModel;
  }
): Promise<void> {
  // Gate: only run if session has enough messages
  if (input.recentMessages.length < MIN_MESSAGES_FOR_EXTRACTION) return;

  const conversationSummary = input.recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const { object } = await generateObject({
    model: input.model ?? pantheonFastModel,
    schema: patternSchema,
    temperature: 0.3,
    system: `You are analyzing a conversation between a farmer and their AI assistant to extract behavioral patterns. Focus on:
- Routines: regular activities the farmer does (e.g., "checks grain bids every Monday morning")
- Preferences: stated or implied preferences (e.g., "prefers CHS elevator for corn")
- Seasonal: seasonal activities or concerns (e.g., "starts planting in late April")
- Workflows: multi-step processes the farmer follows

Only extract clear, actionable patterns. Do NOT extract generic farming knowledge.
Extract at most 3 patterns per conversation.

Existing known patterns (avoid duplicates):
${input.existingPatterns.length > 0 ? input.existingPatterns.join("\n") : "None yet."}`,
    messages: [
      {
        role: "user",
        content: `Extract behavioral patterns from this conversation:\n\n${conversationSummary}`,
      },
    ],
  });

  if (!object.patterns.length) return;

  const records = object.patterns
    .filter((p) => p.confidence >= 0.6)
    .map((p) => ({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      content: `[pattern:${p.pattern_type}] ${p.content} | trigger: ${p.trigger_condition}`,
      memory_type: "preference" as const,
      memory_tier: "episodic" as const,
      source_session_id: input.sessionId,
      confidence_score: p.confidence,
      metadata: {
        pattern_type: p.pattern_type,
        trigger_condition: p.trigger_condition,
        extracted_at: new Date().toISOString(),
      },
    }));

  if (records.length > 0) {
    await admin.from("tenant_memory_records").insert(records);
  }
}
