import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { validateContent } from "./memory-write-validator";
import { classifyMemoryTier } from "./memory-tier-classifier";
import type { MemoryType } from "./memory-tier-classifier";
import { generateEmbedding } from "./embeddings";
import type { MemoryCaptureLevel } from "@/types/memory";

export interface WriteMemoryRecordInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  sessionId: string | null;
  content: string;
  memoryType: MemoryType;
  confidence: number;
  source: "runtime" | "system";
  captureLevel?: MemoryCaptureLevel;
  excludeCategories?: string[];
}

export type WriteMemoryRecordResult =
  | { ok: true; id: string; tier: string; supersededId?: string }
  | { ok: false; reason: string };

export function computeContentHash(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

export async function writeMemoryRecord(
  input: WriteMemoryRecordInput
): Promise<WriteMemoryRecordResult> {
  const {
    admin,
    tenantId,
    customerId,
    sessionId,
    content,
    memoryType,
    confidence,
    source,
    captureLevel = "standard",
    excludeCategories = [],
  } = input;

  // 1. Validate content
  const validation = validateContent({
    content,
    memoryType,
    confidence,
    captureLevel,
    excludeCategories,
  });
  if (!validation.valid) {
    return { ok: false, reason: validation.reason };
  }

  // 2. Hash-first dedup (avoids embedding API call for exact duplicates)
  const contentHash = computeContentHash(content);

  const { data: existing } = await admin
    .from("tenant_memory_records")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("content_hash", contentHash)
    .eq("is_tombstoned", false)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: false, reason: "Duplicate content hash" };
  }

  // 3. Generate embedding (best-effort)
  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(content);
  } catch {
    // proceed without embedding
  }

  // 4. Classify tier
  const tier = classifyMemoryTier(memoryType, confidence, content);

  // 5. Atomic upsert with dedup (handles semantic dedup + supersede in one transaction)
  const { data, error } = await admin.rpc("upsert_memory_with_dedup", {
    p_tenant_id: tenantId,
    p_customer_id: customerId,
    p_session_id: sessionId,
    p_memory_tier: tier,
    p_memory_type: memoryType,
    p_content_text: content,
    p_content_json: {},
    p_confidence: confidence,
    p_source: source,
    p_content_hash: contentHash,
    ...(embedding.length > 0
      ? { p_embedding: JSON.stringify(embedding) }
      : {}),
  });

  if (error) {
    // Unique constraint on content_hash — treat as dedup
    if (error.code === "23505") {
      return { ok: false, reason: "Duplicate content hash" };
    }
    return { ok: false, reason: `Insert failed: ${error.message}` };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || row.was_duplicate) {
    return { ok: false, reason: "Duplicate memory" };
  }

  return {
    ok: true,
    id: row.new_id,
    tier,
    supersededId: row.superseded_id ?? undefined,
  };
}
