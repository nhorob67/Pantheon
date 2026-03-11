import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const DEFAULT_PRIMARY_MODEL_ID = "claude-sonnet-4-20250514";
export const DEFAULT_FAST_MODEL_ID = "claude-haiku-4-5-20251001";

export const pantheonModel = anthropic(DEFAULT_PRIMARY_MODEL_ID);
export const pantheonFastModel = anthropic(DEFAULT_FAST_MODEL_ID);

export const AI_CONFIG = {
  maxOutputTokens: 1024,
  temperature: 0.7,
} as const;
