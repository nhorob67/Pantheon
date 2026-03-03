import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";
import { sanitizeLikePattern } from "../security/postgrest-sanitize.ts";

export interface RuntimeQueryToolExecutionResult {
  output: Record<string, unknown>;
}

const QUERY_TOOL_KEYS = new Set([
  "tenant_scale_ticket_query",
  "tenant_grain_bid_query",
  "tenant_memory_search",
]);

const VALID_ORDER_BY = [
  "date DESC",
  "date ASC",
  "net_weight_lbs DESC",
  "net_weight_lbs ASC",
  "bushels DESC",
  "bushels ASC",
  "created_at DESC",
  "created_at ASC",
] as const;

const VALID_AGGREGATIONS = [
  "none",
  "sum_by_crop",
  "sum_by_elevator",
  "sum_by_date",
  "count",
] as const;

const VALID_MEMORY_TIERS = ["working", "episodic", "knowledge"] as const;

type OrderBy = (typeof VALID_ORDER_BY)[number];
type Aggregation = (typeof VALID_AGGREGATIONS)[number];
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

export interface ScaleTicketQueryArgs {
  date_from: string | null;
  date_to: string | null;
  crop: string | null;
  elevator: string | null;
  field: string | null;
  limit: number;
  order_by: OrderBy;
  aggregation: Aggregation;
}

export function normalizeScaleTicketQueryArgs(
  args: Record<string, unknown>
): ScaleTicketQueryArgs {
  const order_by = asNonEmptyString(args.order_by) || "date DESC";
  if (
    !VALID_ORDER_BY.includes(order_by as OrderBy)
  ) {
    throw new Error(
      `order_by must be one of: ${VALID_ORDER_BY.join(", ")}`
    );
  }

  const aggregation = asNonEmptyString(args.aggregation) || "none";
  if (
    !VALID_AGGREGATIONS.includes(aggregation as Aggregation)
  ) {
    throw new Error(
      `aggregation must be one of: ${VALID_AGGREGATIONS.join(", ")}`
    );
  }

  return {
    date_from: asNonEmptyString(args.date_from),
    date_to: asNonEmptyString(args.date_to),
    crop: asNonEmptyString(args.crop),
    elevator: asNonEmptyString(args.elevator),
    field: asNonEmptyString(args.field),
    limit: asPositiveInt(args.limit, 50, 200),
    order_by: order_by as OrderBy,
    aggregation: aggregation as Aggregation,
  };
}

export interface GrainBidQueryArgs {
  elevator_key: string | null;
  crop: string | null;
  max_age_hours: number;
}

export function normalizeGrainBidQueryArgs(
  args: Record<string, unknown>
): GrainBidQueryArgs {
  const maxAgeRaw = args.max_age_hours;
  let max_age_hours = 24;
  if (maxAgeRaw !== undefined && maxAgeRaw !== null) {
    const num =
      typeof maxAgeRaw === "number"
        ? maxAgeRaw
        : parseFloat(String(maxAgeRaw));
    if (Number.isFinite(num) && num > 0) {
      max_age_hours = num;
    }
  }

  return {
    elevator_key: asNonEmptyString(args.elevator_key),
    crop: asNonEmptyString(args.crop),
    max_age_hours,
  };
}

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
// Scale ticket query
// ---------------------------------------------------------------------------

interface ScaleTicketRow {
  crop?: string;
  elevator?: string;
  date?: string;
  net_weight_lbs?: number;
  bushels?: number;
  [key: string]: unknown;
}

function groupAndSum(
  rows: ScaleTicketRow[],
  groupKey: "crop" | "elevator" | "date"
): {
  summary: { group: string; net_weight_lbs: number; bushels: number }[];
  total_bushels: number;
  total_lbs: number;
} {
  const groups = new Map<
    string,
    { net_weight_lbs: number; bushels: number }
  >();
  let total_bushels = 0;
  let total_lbs = 0;

  for (const row of rows) {
    const key = String(row[groupKey] ?? "unknown");
    const lbs = typeof row.net_weight_lbs === "number" ? row.net_weight_lbs : 0;
    const bu = typeof row.bushels === "number" ? row.bushels : 0;

    const existing = groups.get(key);
    if (existing) {
      existing.net_weight_lbs += lbs;
      existing.bushels += bu;
    } else {
      groups.set(key, { net_weight_lbs: lbs, bushels: bu });
    }
    total_lbs += lbs;
    total_bushels += bu;
  }

  const summary = Array.from(groups.entries()).map(([group, totals]) => ({
    group,
    ...totals,
  }));

  return { summary, total_bushels, total_lbs };
}

async function executeScaleTicketQuery(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeQueryToolExecutionResult> {
  const normalized = normalizeScaleTicketQueryArgs(args);

  // For count aggregation, use head: true to avoid fetching rows
  if (normalized.aggregation === "count") {
    let query = admin
      .from("tenant_scale_tickets")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", run.tenant_id);

    if (normalized.date_from) {
      query = query.gte("date", normalized.date_from);
    }
    if (normalized.date_to) {
      query = query.lte("date", normalized.date_to);
    }
    if (normalized.crop) {
      query = query.ilike("crop", normalized.crop);
    }
    if (normalized.elevator) {
      query = query.ilike("elevator", normalized.elevator);
    }
    if (normalized.field) {
      query = query.ilike("field", normalized.field);
    }

    const { count, error } = await query;
    if (error) {
      throw new Error(error.message || "Failed to count scale tickets");
    }

    return { output: { count: count ?? 0 } };
  }

  // For aggregation queries that need full rows, fetch without limit
  const needsAllRows =
    normalized.aggregation === "sum_by_crop" ||
    normalized.aggregation === "sum_by_elevator" ||
    normalized.aggregation === "sum_by_date";

  let query = admin
    .from("tenant_scale_tickets")
    .select("*")
    .eq("tenant_id", run.tenant_id);

  if (normalized.date_from) {
    query = query.gte("date", normalized.date_from);
  }
  if (normalized.date_to) {
    query = query.lte("date", normalized.date_to);
  }
  if (normalized.crop) {
    query = query.ilike("crop", normalized.crop);
  }
  if (normalized.elevator) {
    query = query.ilike("elevator", normalized.elevator);
  }
  if (normalized.field) {
    query = query.ilike("field", normalized.field);
  }

  if (!needsAllRows) {
    // Parse order_by into column + direction
    const [orderCol, orderDir] = normalized.order_by.split(" ") as [
      string,
      string,
    ];
    query = query
      .order(orderCol, { ascending: orderDir === "ASC" })
      .limit(normalized.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to query scale tickets");
  }

  const rows = (data ?? []) as ScaleTicketRow[];

  if (normalized.aggregation === "none") {
    return {
      output: { tickets: rows, count: rows.length },
    };
  }

  // sum_by_crop | sum_by_elevator | sum_by_date
  const groupKey =
    normalized.aggregation === "sum_by_crop"
      ? "crop"
      : normalized.aggregation === "sum_by_elevator"
        ? "elevator"
        : "date";

  const grouped = groupAndSum(rows, groupKey);
  return { output: grouped };
}

// ---------------------------------------------------------------------------
// Grain bid query
// ---------------------------------------------------------------------------

async function executeGrainBidQuery(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeQueryToolExecutionResult> {
  const normalized = normalizeGrainBidQueryArgs(args);

  const cutoff = new Date(
    Date.now() - normalized.max_age_hours * 60 * 60 * 1000
  ).toISOString();

  let query = admin
    .from("grain_bid_cache")
    .select("*")
    .gte("scraped_at", cutoff)
    .order("scraped_at", { ascending: false })
    .limit(100);

  if (normalized.elevator_key) {
    query = query.eq("elevator_key", normalized.elevator_key);
  }
  if (normalized.crop) {
    query = query.ilike("crop", normalized.crop);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to query grain bid cache");
  }

  const bids = data ?? [];
  return { output: { bids, count: bids.length } };
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
    case "tenant_scale_ticket_query":
      return executeScaleTicketQuery(admin, input.run, input.args);
    case "tenant_grain_bid_query":
      return executeGrainBidQuery(admin, input.run, input.args);
    case "tenant_memory_search":
      return executeMemorySearch(admin, input.run, input.args);
    default:
      throw new Error(`Unsupported runtime query tool: ${input.toolKey}`);
  }
}
