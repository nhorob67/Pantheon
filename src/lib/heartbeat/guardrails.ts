import type { CheapCheckResult } from "@/types/heartbeat";

export interface HeartbeatGuardrailMatch {
  label: string;
  count: number;
}

export interface HeartbeatGuardrailEvaluation {
  blocked: boolean;
  reason: string | null;
  metadata: Record<string, unknown>;
}

const MAX_SOURCE_STRINGS = 24;
const MAX_STRING_LENGTH = 400;

const PII_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "ssn" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit_card" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, label: "email_address" },
  { pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, label: "phone_number" },
  { pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i, label: "password" },
  { pattern: /\b(?:sk-|pk_live_|pk_test_|api[_-]?key\s*[:=]\s*)\S+/i, label: "api_key" },
];

const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bignore (all |any |the )?(previous|prior|above) (instructions|prompts|directions)\b/i, label: "ignore_previous_instructions" },
  { pattern: /\b(system prompt|developer prompt|hidden prompt)\b/i, label: "prompt_reference" },
  { pattern: /\b(reveal|print|show|expose)\b.{0,40}\b(prompt|system|developer instructions)\b/i, label: "prompt_exfiltration" },
  { pattern: /<\s*\/?\s*(system|assistant|developer)\s*>/i, label: "role_tag_markup" },
  { pattern: /\byou are (chatgpt|an ai assistant|the system)\b/i, label: "role_redefinition" },
  { pattern: /\b(do not follow|disregard|override)\b.{0,40}\b(instructions|rules|policy)\b/i, label: "instruction_override" },
];

function truncateSample(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157)}...`;
}

function incrementCount(
  map: Map<string, number>,
  label: string
): void {
  map.set(label, (map.get(label) || 0) + 1);
}

function toMatches(map: Map<string, number>): HeartbeatGuardrailMatch[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function collectStrings(value: unknown, output: string[], limit: number): void {
  if (output.length >= limit) {
    return;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      output.push(trimmed.slice(0, MAX_STRING_LENGTH));
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, output, limit);
      if (output.length >= limit) {
        return;
      }
    }
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, output, limit);
      if (output.length >= limit) {
        return;
      }
    }
  }
}

function evaluateTexts(
  stage: "source" | "output",
  texts: string[]
): HeartbeatGuardrailEvaluation {
  const piiMatches = new Map<string, number>();
  const injectionMatches = new Map<string, number>();
  const samples: string[] = [];

  for (const text of texts) {
    for (const { pattern, label } of PII_PATTERNS) {
      if (pattern.test(text)) {
        incrementCount(piiMatches, label);
        if (samples.length < 3) {
          samples.push(truncateSample(text));
        }
      }
    }

    for (const { pattern, label } of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        incrementCount(injectionMatches, label);
        if (samples.length < 3) {
          samples.push(truncateSample(text));
        }
      }
    }
  }

  const pii = toMatches(piiMatches);
  const injection = toMatches(injectionMatches);
  const blocked = pii.length > 0 || injection.length > 0;
  const reason = pii.length > 0
    ? `guardrail_${stage}_pii_detected`
    : injection.length > 0
      ? `guardrail_${stage}_injection_detected`
      : null;

  return {
    blocked,
    reason,
    metadata: {
      stage,
      blocked,
      pii_matches: pii,
      injection_matches: injection,
      sample_count: samples.length,
      samples,
    },
  };
}

export function evaluateHeartbeatSourceGuardrails(
  checks: Record<string, CheapCheckResult>
): HeartbeatGuardrailEvaluation {
  const texts: string[] = [];

  for (const result of Object.values(checks)) {
    if (typeof result.summary === "string") {
      collectStrings(result.summary, texts, MAX_SOURCE_STRINGS);
    }
    collectStrings(result.data, texts, MAX_SOURCE_STRINGS);
    if (texts.length >= MAX_SOURCE_STRINGS) {
      break;
    }
  }

  return evaluateTexts("source", texts);
}

export function evaluateHeartbeatOutputGuardrails(
  text: string
): HeartbeatGuardrailEvaluation {
  return evaluateTexts("output", [text]);
}
