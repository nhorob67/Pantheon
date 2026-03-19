/**
 * Deterministic (LLM-free) compaction fallback.
 *
 * When the LLM is unavailable or fails, this module produces a best-effort
 * summary using heuristic extraction: topic sentences, entity extraction,
 * and temporal markers — no AI calls required.
 */

interface MessageInput {
  direction: "inbound" | "outbound";
  content_text: string;
  created_at: string;
}

interface DeterministicSummaryResult {
  summary: string;
  facts: Array<{
    content: string;
    type: "fact" | "preference" | "commitment";
    confidence: number;
  }>;
}

// Commitment markers (user intends to do something)
const COMMITMENT_PATTERNS = [
  /\b(?:i will|i'll|we will|we'll|i plan to|we plan to|going to|committed to)\b/i,
  /\b(?:by (?:end of|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
  /\b(?:promise to|agreed to|i need to|we need to)\b/i,
];

// Preference markers
const PREFERENCE_PATTERNS = [
  /\b(?:i prefer|i like|i want|i'd rather|we prefer|we like|please always|please never)\b/i,
  /\b(?:don't want|do not want|hate when|love when|i enjoy)\b/i,
];

// Named entity patterns (simple heuristic — capitalized multi-word phrases)
const ENTITY_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;

// Numeric fact patterns (measurements, percentages, dates, counts)
const NUMERIC_FACT_PATTERN =
  /\b\d+(?:\.\d+)?(?:\s*(?:%|percent|dollars?|units?|hours?|days?|months?|FTEs?|people|projects?|members?|K|M))\b/i;

// Temporal markers for context
const TEMPORAL_PATTERN =
  /\b(?:today|yesterday|tomorrow|last (?:week|month|year)|next (?:week|month|year)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{4})?|Q[1-4]\s+\d{4}|\d{4})\b/i;

/**
 * Generate a deterministic summary from conversation messages without an LLM.
 *
 * Strategy:
 * 1. Extract topic sentences (first substantive sentence from user messages)
 * 2. Identify commitments, preferences, and factual statements
 * 3. Pull named entities and temporal anchors
 * 4. Assemble a structured summary from these signals
 */
export function generateDeterministicSummary(
  messages: MessageInput[]
): DeterministicSummaryResult {
  if (messages.length === 0) {
    return { summary: "No messages to summarize.", facts: [] };
  }

  const userMessages = messages.filter((m) => m.direction === "inbound");
  const assistantMessages = messages.filter((m) => m.direction === "outbound");
  const facts: DeterministicSummaryResult["facts"] = [];

  // 1. Extract topic sentences from user messages
  const topicSentences: string[] = [];
  for (const msg of userMessages) {
    const sentence = extractFirstSubstantiveSentence(msg.content_text);
    if (sentence && sentence.length >= 15) {
      topicSentences.push(sentence);
    }
  }

  // 2. Extract commitments from user messages
  for (const msg of userMessages) {
    for (const pattern of COMMITMENT_PATTERNS) {
      if (pattern.test(msg.content_text)) {
        const sentence = extractSentenceContaining(msg.content_text, pattern);
        if (sentence) {
          facts.push({
            content: truncate(sentence, 200),
            type: "commitment",
            confidence: 0.6,
          });
        }
        break; // one per message
      }
    }
  }

  // 3. Extract preferences from user messages
  for (const msg of userMessages) {
    for (const pattern of PREFERENCE_PATTERNS) {
      if (pattern.test(msg.content_text)) {
        const sentence = extractSentenceContaining(msg.content_text, pattern);
        if (sentence) {
          facts.push({
            content: truncate(sentence, 200),
            type: "preference",
            confidence: 0.6,
          });
        }
        break;
      }
    }
  }

  // 4. Extract numeric facts
  for (const msg of [...userMessages, ...assistantMessages]) {
    if (NUMERIC_FACT_PATTERN.test(msg.content_text)) {
      const sentence = extractSentenceContaining(msg.content_text, NUMERIC_FACT_PATTERN);
      if (sentence && !facts.some((f) => f.content === truncate(sentence, 200))) {
        facts.push({
          content: truncate(sentence, 200),
          type: "fact",
          confidence: 0.5,
        });
      }
    }
  }

  // Limit to 5 facts
  const selectedFacts = facts.slice(0, 5);

  // 5. Collect entities and temporal markers for context
  const allText = messages.map((m) => m.content_text).join(" ");
  const entities = extractEntities(allText);
  const temporal = extractTemporalMarkers(allText);

  // 6. Assemble summary
  const timeRange = formatTimeRange(messages);
  const parts: string[] = [];

  parts.push(
    `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} assistant messages${timeRange}.`
  );

  if (topicSentences.length > 0) {
    const uniqueTopics = deduplicateByOverlap(topicSentences, 3);
    parts.push(`Topics discussed: ${uniqueTopics.join("; ")}`);
  }

  if (entities.length > 0) {
    parts.push(`Entities mentioned: ${entities.slice(0, 8).join(", ")}`);
  }

  if (temporal.length > 0) {
    parts.push(`Time references: ${temporal.slice(0, 5).join(", ")}`);
  }

  if (selectedFacts.length > 0) {
    const factSummaries = selectedFacts.map((f) => `[${f.type}] ${f.content}`);
    parts.push(`Key points: ${factSummaries.join("; ")}`);
  }

  return {
    summary: parts.join(" "),
    facts: selectedFacts,
  };
}

// --- Helpers ---

function extractFirstSubstantiveSentence(text: string): string | null {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    // Skip very short or greeting-like sentences
    if (s.length < 15) continue;
    if (/^(?:hi|hello|hey|thanks|ok|sure|yes|no|okay)\b/i.test(s)) continue;
    return truncate(s, 150);
  }
  return sentences[0] ? truncate(sentences[0], 150) : null;
}

function extractSentenceContaining(text: string, pattern: RegExp): string | null {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (pattern.test(s)) {
      return truncate(s, 200);
    }
  }
  return null;
}

function extractEntities(text: string): string[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(ENTITY_PATTERN.source, "g");
  while ((match = re.exec(text)) !== null) {
    const entity = match[1];
    // Filter out common false positives
    if (!isCommonPhrase(entity)) {
      matches.add(entity);
    }
  }
  return Array.from(matches);
}

const COMMON_PHRASES = new Set([
  "The", "This", "That", "These", "Those", "What", "When", "Where", "Which", "How",
  "Thank You", "Good Morning", "Good Afternoon", "Good Evening",
  "Let Me", "Can You", "Could You", "Would You",
]);

function isCommonPhrase(text: string): boolean {
  return COMMON_PHRASES.has(text) || text.split(/\s+/).length > 4;
}

function extractTemporalMarkers(text: string): string[] {
  const markers = new Set<string>();
  const re = new RegExp(TEMPORAL_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    markers.add(match[0]);
  }
  return Array.from(markers);
}

function formatTimeRange(messages: MessageInput[]): string {
  if (messages.length === 0) return "";
  const first = new Date(messages[0].created_at);
  const last = new Date(messages[messages.length - 1].created_at);
  const diffMs = last.getTime() - first.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return " in under a minute";
  if (diffMins < 60) return ` over ${diffMins} minutes`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return ` over ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  const diffDays = Math.round(diffHours / 24);
  return ` over ${diffDays} day${diffDays > 1 ? "s" : ""}`;
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + "..." : text;
}

/**
 * Deduplicate strings by word overlap: if two strings share >= threshold words, keep the longer.
 */
function deduplicateByOverlap(strings: string[], threshold: number): string[] {
  const result: string[] = [];
  for (const s of strings) {
    const words = new Set(s.toLowerCase().split(/\s+/));
    const isDuplicate = result.some((existing) => {
      const existingWords = new Set(existing.toLowerCase().split(/\s+/));
      let overlap = 0;
      for (const w of words) {
        if (existingWords.has(w)) overlap++;
      }
      return overlap >= threshold;
    });
    if (!isDuplicate) {
      result.push(s);
    }
  }
  return result;
}
