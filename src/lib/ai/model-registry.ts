import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function createModelFromCatalog(entry: {
  id: string;
  provider: string;
}): LanguageModel {
  if (entry.provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return anthropic(entry.id);
  }

  if (entry.provider === "openrouter") {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    return openrouter(entry.id);
  }

  throw new Error(`Unsupported model provider: ${entry.provider}`);
}
