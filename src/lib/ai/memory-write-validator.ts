import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryCaptureLevel } from "../../types/memory.ts";
import type { MemoryType } from "./memory-tier-classifier.ts";
export type WriteValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

interface ValidateInput {
  content: string;
  memoryType: MemoryType;
  confidence: number;
  captureLevel: MemoryCaptureLevel;
  excludeCategories: string[];
}

interface DedupInput {
  admin: SupabaseClient;
  tenantId: string;
  content: string;
  memoryType: MemoryType;
  confidence: number;
  embedding: number[];
}

// --- PII patterns ---
const PII_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, label: "SSN" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, label: "credit card" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, label: "email address" },
  { pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, label: "phone number" },
  { pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/i, label: "password" },
  { pattern: /\b(?:sk-|pk_live_|pk_test_|api[_-]?key\s*[:=]\s*)\S+/i, label: "API key" },
];

// --- Junk patterns ---
const JUNK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\s*$/, label: "all whitespace" },
  { pattern: /(.)\1{10,}/, label: "repeated characters" },
  { pattern: /^https?:\/\/\S+$/, label: "bare URL" },
  { pattern: /^\d+(\.\d+)?$/, label: "numbers only" },
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 6000;

/**
 * Validate memory content before writing. Checks run in order (fail-fast).
 */
export function validateContent(input: ValidateInput): WriteValidationResult {
  const trimmed = input.content.trim();

  // 1. Length check
  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reason: `Content too short (${trimmed.length} chars, minimum ${MIN_LENGTH})` };
  }
  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, reason: `Content too long (${trimmed.length} chars, maximum ${MAX_LENGTH})` };
  }

  // 2. PII check
  for (const { pattern, label } of PII_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Content contains ${label} — PII is not allowed in memory` };
    }
  }

  // 3. Junk filter
  for (const { pattern, label } of JUNK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Content rejected: ${label}` };
    }
  }

  // 4. Capture level enforcement
  const captureLevelResult = validateCaptureLevel(
    input.captureLevel,
    input.memoryType,
    input.confidence
  );
  if (!captureLevelResult.valid) return captureLevelResult;

  // 5. Excluded categories
  if (input.excludeCategories.length > 0) {
    const lower = trimmed.toLowerCase();
    for (const category of input.excludeCategories) {
      if (lower.includes(category.toLowerCase())) {
        return { valid: false, reason: `Content matches excluded category: ${category}` };
      }
    }
  }

  return { valid: true };
}

function validateCaptureLevel(
  level: MemoryCaptureLevel,
  memoryType: MemoryType,
  confidence: number
): WriteValidationResult {
  switch (level) {
    case "conservative":
      if (memoryType !== "fact" && memoryType !== "commitment") {
        return { valid: false, reason: `Capture level 'conservative' only allows fact/commitment types (got ${memoryType})` };
      }
      if (confidence < 0.7) {
        return { valid: false, reason: `Capture level 'conservative' requires confidence >= 0.7 (got ${confidence})` };
      }
      break;
    case "standard":
      if (confidence < 0.5) {
        return { valid: false, reason: `Capture level 'standard' requires confidence >= 0.5 (got ${confidence})` };
      }
      break;
    case "aggressive":
      // All types, any confidence
      break;
  }
  return { valid: true };
}

/**
 * @deprecated Use the `upsert_memory_with_dedup` RPC function instead.
 * Dedup is now handled atomically in SQL to prevent orphaned tombstones.
 */
export async function checkDedup(_input: DedupInput): Promise<{
  valid: boolean;
  reason?: string;
  supersededId?: string;
}> {
  return { valid: true };
}
