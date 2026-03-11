import { generateText, type LanguageModel } from "ai";
import { decomposeQuery } from "./query-decomposer.ts";
import { pantheonFastModel } from "./client";

export interface ExpandedQuery {
  original: string;
  lex: string[];
  vec: string[];
  hyde: string | null;
  source: "llm" | "heuristic";
}

export interface TaggedSubQuery {
  text: string;
  type: "original" | "lex" | "vec" | "hyde";
}

const MAX_SUB_QUERIES = 5;

const SYSTEM_PROMPT = `You are a query expansion engine for a farm memory system used by Upper Midwest row crop farmers.

Given a user query, produce JSON with these fields:
- "lex": 1-2 keyword phrases for full-text search (2-5 words each). Focus on specific nouns, crop names, and farm terminology.
- "vec": exactly 1 natural-language question for embedding search (5-12 words). Rephrase the query to capture the core intent.
- "hyde": a hypothetical memory passage that would answer the query (50-200 characters), or null if the query is too short/vague.

Domain terms: corn, soybeans, spring wheat, winter wheat, durum, barley, sunflowers, canola, dry beans, flax, basis, elevator, CHS, ADM, Cargill, GDD, growing degree days, moisture, bushel, scale ticket, bin, field, township, section, hauling, planting, harvest, spray window, fungicide, herbicide, fertilizer.

Return ONLY valid JSON. No markdown fences, no explanation.`;

function buildUserPrompt(query: string): string {
  return `Query: "${query}"`;
}

/**
 * Expand a query into multiple sub-queries using Haiku.
 * Falls back to heuristic decomposeQuery on any failure.
 */
export async function expandQuery(query: string, model?: LanguageModel): Promise<ExpandedQuery> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) {
    return heuristicFallback(trimmed);
  }

  try {
    const { text } = await generateText({
      model: model ?? pantheonFastModel,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(trimmed),
      maxOutputTokens: 150,
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(2000),
    });

    return parseExpansionResponse(trimmed, text);
  } catch {
    return heuristicFallback(trimmed);
  }
}

/**
 * Parse and validate the LLM response into an ExpandedQuery.
 */
export function parseExpansionResponse(
  original: string,
  text: string
): ExpandedQuery {
  // Strip markdown fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return heuristicFallback(original);
  }

  if (!parsed || typeof parsed !== "object") {
    return heuristicFallback(original);
  }

  const obj = parsed as Record<string, unknown>;

  // Validate and extract lex
  const lex: string[] = [];
  if (Array.isArray(obj.lex)) {
    for (const item of obj.lex) {
      if (typeof item === "string" && item.length >= 2 && item.length <= 50) {
        lex.push(item);
      }
    }
  }

  // Validate and extract vec
  const vec: string[] = [];
  if (Array.isArray(obj.vec)) {
    for (const item of obj.vec) {
      if (typeof item === "string" && item.length >= 5 && item.length <= 120) {
        vec.push(item);
      }
    }
  }

  // Validate hyde
  let hyde: string | null = null;
  if (typeof obj.hyde === "string" && obj.hyde.length >= 10 && obj.hyde.length <= 300) {
    hyde = obj.hyde;
  }

  // Must have at least one expansion
  if (lex.length === 0 && vec.length === 0 && hyde === null) {
    return heuristicFallback(original);
  }

  return {
    original,
    lex: lex.slice(0, 2),
    vec: vec.slice(0, 1),
    hyde,
    source: "llm",
  };
}

/**
 * Flatten an ExpandedQuery into tagged sub-queries for the search pipeline.
 * Always includes the original. Caps at MAX_SUB_QUERIES total.
 */
export function flattenExpansion(expanded: ExpandedQuery): TaggedSubQuery[] {
  const result: TaggedSubQuery[] = [
    { text: expanded.original, type: "original" },
  ];

  for (const l of expanded.lex) {
    if (result.length >= MAX_SUB_QUERIES) break;
    result.push({ text: l, type: "lex" });
  }

  for (const v of expanded.vec) {
    if (result.length >= MAX_SUB_QUERIES) break;
    result.push({ text: v, type: "vec" });
  }

  if (expanded.hyde && result.length < MAX_SUB_QUERIES) {
    result.push({ text: expanded.hyde, type: "hyde" });
  }

  return result;
}

function heuristicFallback(query: string): ExpandedQuery {
  const parts = decomposeQuery(query);
  return {
    original: query,
    lex: parts.slice(1), // parts[0] is always the original
    vec: [],
    hyde: null,
    source: "heuristic",
  };
}
