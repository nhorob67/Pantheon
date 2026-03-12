import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMORY_TIER_VALUES = ["working", "episodic", "knowledge"] as const;
const MEMORY_TYPE_VALUES = [
  "fact",
  "preference",
  "commitment",
  "outcome",
  "summary",
  "other",
] as const;
const MUTATING_TOOL_KEYS = new Set([
  "tenant_memory_write",
  "reveal_secret",
]);

type MemoryTier = (typeof MEMORY_TIER_VALUES)[number];
type MemoryType = (typeof MEMORY_TYPE_VALUES)[number];

export interface RuntimeMutatingToolExecutionResult {
  output: Record<string, unknown>;
}

export interface TenantMemoryWriteToolArgs {
  content_text: string;
  content_json: Record<string, unknown>;
  memory_tier: MemoryTier;
  memory_type: MemoryType;
  confidence: number;
  session_id: string | null;
  source_message_id: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalUuid(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = asNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

function asConfidence(value: unknown): number {
  if (value === undefined || value === null) {
    return 0.8;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("confidence must be a finite number between 0 and 1");
  }
  if (value < 0 || value > 1) {
    throw new Error("confidence must be between 0 and 1");
  }
  return value;
}

function parseMemoryTier(value: unknown): MemoryTier {
  const normalized = asNonEmptyString(value) || "episodic";
  if (
    normalized === "working" ||
    normalized === "episodic" ||
    normalized === "knowledge"
  ) {
    return normalized;
  }
  throw new Error(
    `memory_tier must be one of: ${MEMORY_TIER_VALUES.join(", ")}`
  );
}

function parseMemoryType(value: unknown): MemoryType {
  const normalized = asNonEmptyString(value) || "fact";
  if (
    normalized === "fact" ||
    normalized === "preference" ||
    normalized === "commitment" ||
    normalized === "outcome" ||
    normalized === "summary" ||
    normalized === "other"
  ) {
    return normalized;
  }
  throw new Error(
    `memory_type must be one of: ${MEMORY_TYPE_VALUES.join(", ")}`
  );
}

export function isMutatingRuntimeTool(toolKey: string): boolean {
  return MUTATING_TOOL_KEYS.has(toolKey);
}

export function normalizeTenantMemoryWriteToolArgs(
  args: Record<string, unknown>
): TenantMemoryWriteToolArgs {
  const contentText =
    asNonEmptyString(args.content_text) || asNonEmptyString(args.content);

  if (!contentText) {
    throw new Error("tenant_memory_write requires content_text");
  }

  if (contentText.length > 8000) {
    throw new Error("content_text exceeds max length of 8000 characters");
  }

  const contentJson = asRecord(args.content_json);

  return {
    content_text: contentText,
    content_json: contentJson,
    memory_tier: parseMemoryTier(args.memory_tier),
    memory_type: parseMemoryType(args.memory_type),
    confidence: asConfidence(args.confidence),
    session_id: asOptionalUuid(args.session_id, "session_id"),
    source_message_id: asOptionalUuid(
      args.source_message_id,
      "source_message_id"
    ),
  };
}

async function executeTenantMemoryWriteTool(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeMutatingToolExecutionResult> {
  const normalized = normalizeTenantMemoryWriteToolArgs(args);

  const { data, error } = await admin
    .from("tenant_memory_records")
    .insert({
      tenant_id: run.tenant_id,
      customer_id: run.customer_id,
      session_id: normalized.session_id,
      source_message_id: normalized.source_message_id,
      memory_tier: normalized.memory_tier,
      memory_type: normalized.memory_type,
      content_text: normalized.content_text,
      content_json: normalized.content_json,
      confidence: normalized.confidence,
      source: "runtime",
      is_tombstoned: false,
    })
    .select("id, tenant_id, customer_id, memory_tier, memory_type, confidence, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Failed to persist tenant memory record via tool execution"
    );
  }

  return {
    output: {
      memory_record_id: String((data as { id: string }).id),
      memory_tier: String((data as { memory_tier: string }).memory_tier),
      memory_type: String((data as { memory_type: string }).memory_type),
      confidence: Number((data as { confidence: number }).confidence),
      created_at: String((data as { created_at: string }).created_at),
    },
  };
}

export async function executeRuntimeMutatingTool(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolKey: string;
    args: Record<string, unknown>;
  }
): Promise<RuntimeMutatingToolExecutionResult> {
  switch (input.toolKey) {
    case "tenant_memory_write":
      return executeTenantMemoryWriteTool(admin, input.run, input.args);
    default:
      throw new Error(`Unsupported runtime mutating tool: ${input.toolKey}`);
  }
}
