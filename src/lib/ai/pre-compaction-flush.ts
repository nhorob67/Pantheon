import { generateText, type LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pantheonFastModel } from "./client";
import { createMemoryTools } from "./tools/memory";
import type { MemoryCaptureLevel } from "@/types/memory";

const FLUSH_MAX_STEPS = 3;
const FLUSH_MAX_OUTPUT_TOKENS = 200;
const FLUSH_TIMEOUT_MS = 15_000;

const FLUSH_SYSTEM_PROMPT =
  "You are reviewing a conversation that is about to be compressed. Call memory_write for any important facts, preferences, or commitments before they are summarized away. Focus on details the user would expect you to remember. If nothing is worth saving, do nothing.";

interface FlushInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string;
  sessionId: string;
  messages: Array<{ content_text: string | null; direction: string }>;
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
  model?: LanguageModel;
}

export async function runPreCompactionFlush(
  input: FlushInput
): Promise<{ memoriesWritten: number }> {
  const { admin, tenantId, customerId, messages, captureLevel, excludeCategories } = input;

  // Build transcript from messages about to be compressed
  const transcript = messages
    .filter((m) => m.content_text)
    .map((m) => {
      const role = m.direction === "inbound" ? "User" : "Assistant";
      return `${role}: ${m.content_text}`;
    })
    .join("\n");

  if (!transcript.trim()) {
    return { memoriesWritten: 0 };
  }

  // Minimal tool set: only memory_write
  const memoryTools = createMemoryTools(admin, tenantId, customerId, {
    captureLevel: captureLevel ?? "standard",
    excludeCategories: excludeCategories ?? [],
  });

  const tools = { memory_write: memoryTools.memory_write };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: input.model ?? pantheonFastModel,
      maxOutputTokens: FLUSH_MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      system: FLUSH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
      ...(Object.keys(tools).length > 0 ? { tools, maxSteps: FLUSH_MAX_STEPS } : {}),
      abortSignal: controller.signal,
    });

    // Count successful memory_write calls
    const memoriesWritten = result.steps
      .flatMap((s) => s.toolResults)
      .filter((r) => r && typeof r === "object" && "result" in r && (r.result as Record<string, unknown>)?.saved === true)
      .length;

    return { memoriesWritten };
  } finally {
    clearTimeout(timeout);
  }
}
