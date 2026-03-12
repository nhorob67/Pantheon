import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";
import { sanitizeLikePattern } from "../security/postgrest-sanitize.ts";

export interface RuntimeQueryToolExecutionResult {
  output: Record<string, unknown>;
}

const QUERY_TOOL_KEYS = new Set([
  "tenant_memory_search",
]);

const VALID_MEMORY_TIERS = ["working", "episodic", "knowledge"] as const;

type MemoryTier = (typeof VALID_MEMORY_TIERS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asPositiveInt(
  value: unknown,
  defaultVal: number,
  max: number
): number {
  if (value === undefined || value === null) return defaultVal;
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(num) || num < 1) return defaultVal;
  return Math.min(num, max);
}

// ---------------------------------------------------------------------------
// Argument normalizers (exported for testing)
// ---------------------------------------------------------------------------

export interface MemorySearchArgs {
  query_text: string;
  memory_tier: MemoryTier | null;
  limit: number;
}

export function normalizeMemorySearchArgs(
  args: Record<string, unknown>
): MemorySearchArgs {
  const query_text = asNonEmptyString(args.query_text);
  if (!query_text) {
    throw new Error("tenant_memory_search requires query_text");
  }

  const tierRaw = asNonEmptyString(args.memory_tier);
  let memory_tier: MemoryTier | null = null;
  if (tierRaw !== null) {
    if (!VALID_MEMORY_TIERS.includes(tierRaw as MemoryTier)) {
      throw new Error(
        `memory_tier must be one of: ${VALID_MEMORY_TIERS.join(", ")}`
      );
    }
    memory_tier = tierRaw as MemoryTier;
  }

  return {
    query_text,
    memory_tier,
    limit: asPositiveInt(args.limit, 10, 50),
  };
}

// ---------------------------------------------------------------------------
// Registry check
// ---------------------------------------------------------------------------

export function isQueryRuntimeTool(toolKey: string): boolean {
  return QUERY_TOOL_KEYS.has(toolKey);
}

// ---------------------------------------------------------------------------
// Memory search
// ---------------------------------------------------------------------------

async function executeMemorySearch(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeQueryToolExecutionResult> {
  const normalized = normalizeMemorySearchArgs(args);

  const sanitizedQuery = sanitizeLikePattern(normalized.query_text);

  let query = admin
    .from("tenant_memory_records")
    .select("*")
    .eq("tenant_id", run.tenant_id)
    .eq("is_tombstoned", false)
    .ilike("content_text", `%${sanitizedQuery}%`)
    .order("created_at", { ascending: false })
    .limit(normalized.limit);

  if (normalized.memory_tier) {
    query = query.eq("memory_tier", normalized.memory_tier);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to search tenant memory records");
  }

  const memories = data ?? [];
  return { output: { memories, count: memories.length } };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export async function executeRuntimeQueryTool(
  admin: SupabaseClient,
  input: {
    run: TenantRuntimeRun;
    toolKey: string;
    args: Record<string, unknown>;
  }
): Promise<RuntimeQueryToolExecutionResult> {
  switch (input.toolKey) {
    case "tenant_memory_search":
      return executeMemorySearch(admin, input.run, input.args);
    default:
      throw new Error(`Unsupported runtime query tool: ${input.toolKey}`);
  }
}
