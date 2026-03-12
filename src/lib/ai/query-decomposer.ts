const CONJUNCTION_RE = /\b(?:and|also|plus|as well as)\b/i;
const QUESTION_WORD_RE = /\b(?:what|when|where|which|how)\b/gi;
const MAX_SUB_QUERIES = 3;

/**
 * Heuristic query decomposition — zero LLM calls, zero latency.
 *
 * Splits compound queries into sub-queries for parallel search.
 * Returns 1-3 queries: the original plus up to 2 split parts.
 */
export function decomposeQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [trimmed];

  // 1. Try conjunction split
  const conjParts = splitOnConjunctions(trimmed);
  if (conjParts.length > 1) {
    return takeTopQueries(trimmed, conjParts);
  }

  // 2. Try embedded question word split
  const questionParts = splitOnQuestionWords(trimmed);
  if (questionParts.length > 1) {
    return takeTopQueries(trimmed, questionParts);
  }

  // No split applies
  return [trimmed];
}

function splitOnConjunctions(query: string): string[] {
  return query
    .split(CONJUNCTION_RE)
    .map((s) => s.trim())
    .filter((s) => s.length >= 5);
}

function splitOnQuestionWords(query: string): string[] {
  // Find positions of question words
  const matches: number[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(QUESTION_WORD_RE.source, "gi");
  while ((match = re.exec(query)) !== null) {
    matches.push(match.index);
  }

  if (matches.length < 2) return [];

  // Split at each question word position
  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1] : query.length;
    const part = query.slice(start, end).trim().replace(/[,;]\s*$/, "");
    if (part.length >= 5) parts.push(part);
  }

  return parts;
}

function takeTopQueries(original: string, parts: string[]): string[] {
  // Always include original, then up to 2 parts (for MAX_SUB_QUERIES total of 3)
  const result = [original];
  for (const part of parts) {
    if (result.length >= MAX_SUB_QUERIES) break;
    if (part !== original) result.push(part);
  }
  return result;
}
