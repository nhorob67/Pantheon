import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const farmclawModel = anthropic("claude-sonnet-4-5-20250514");

export const AI_CONFIG = {
  maxOutputTokens: 1024,
  temperature: 0.7,
} as const;
