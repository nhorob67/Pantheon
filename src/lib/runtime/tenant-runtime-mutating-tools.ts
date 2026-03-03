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
const BUSHEL_WEIGHTS: Record<string, number> = {
  corn: 56,
  soybeans: 60,
  "spring wheat": 60,
  "winter wheat": 60,
  durum: 60,
  barley: 48,
  sunflowers: 24,
  canola: 50,
  "dry beans": 60,
  flax: 56,
};

const SCALE_TICKET_SOURCE_VALUES = ["manual", "voice", "ocr"] as const;
type ScaleTicketSource = (typeof SCALE_TICKET_SOURCE_VALUES)[number];

const MUTATING_TOOL_KEYS = new Set([
  "tenant_memory_write",
  "tenant_scale_ticket_create",
  "tenant_scale_ticket_update",
  "tenant_scale_ticket_delete",
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

export interface TenantScaleTicketCreateArgs {
  date: string;
  crop: string;
  elevator: string;
  net_weight_lbs: number;
  bushels: number;
  gross_weight_lbs: number | null;
  tare_weight_lbs: number | null;
  moisture_pct: number | null;
  test_weight: number | null;
  dockage_pct: number | null;
  price_per_bushel: number | null;
  grade: string | null;
  truck_number: string | null;
  load_number: string | null;
  field: string | null;
  notes: string | null;
  source: ScaleTicketSource;
}

function asOptionalPositiveNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function parseScaleTicketSource(value: unknown): ScaleTicketSource {
  const normalized = asNonEmptyString(value) || "manual";
  if (
    normalized === "manual" ||
    normalized === "voice" ||
    normalized === "ocr"
  ) {
    return normalized;
  }
  throw new Error(
    `source must be one of: ${SCALE_TICKET_SOURCE_VALUES.join(", ")}`
  );
}

function parseDateString(value: unknown): string {
  if (value === undefined || value === null) {
    return new Date().toISOString().slice(0, 10);
  }
  const str = asNonEmptyString(value);
  if (!str) {
    return new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error("date must be in YYYY-MM-DD format");
  }
  const parsed = new Date(str + "T00:00:00Z");
  if (isNaN(parsed.getTime())) {
    throw new Error("date is not a valid calendar date");
  }
  return str;
}

export function normalizeScaleTicketCreateArgs(
  args: Record<string, unknown>
): TenantScaleTicketCreateArgs {
  const crop = asNonEmptyString(args.crop)?.toLowerCase();
  if (!crop) {
    throw new Error("tenant_scale_ticket_create requires crop");
  }

  const elevator = asNonEmptyString(args.elevator);
  if (!elevator) {
    throw new Error("tenant_scale_ticket_create requires elevator");
  }

  const rawWeight = args.net_weight_lbs ?? args.net_weight;
  if (rawWeight === undefined || rawWeight === null) {
    throw new Error("tenant_scale_ticket_create requires net_weight_lbs");
  }
  const netWeightLbs =
    typeof rawWeight === "number" ? rawWeight : parseInt(String(rawWeight), 10);
  if (!Number.isFinite(netWeightLbs) || netWeightLbs <= 0) {
    throw new Error("net_weight_lbs must be a positive integer");
  }

  let bushels: number;
  const rawBushels = asOptionalPositiveNumber(args.bushels);
  if (rawBushels !== null && rawBushels > 0) {
    bushels = rawBushels;
  } else {
    const bushelWeight = BUSHEL_WEIGHTS[crop];
    if (!bushelWeight) {
      throw new Error(
        `Unknown crop "${crop}" for bushel conversion. Known crops: ${Object.keys(BUSHEL_WEIGHTS).join(", ")}`
      );
    }
    bushels = Math.round((netWeightLbs / bushelWeight) * 100) / 100;
  }

  return {
    date: parseDateString(args.date),
    crop,
    elevator,
    net_weight_lbs: netWeightLbs,
    bushels,
    gross_weight_lbs: asOptionalPositiveNumber(args.gross_weight_lbs),
    tare_weight_lbs: asOptionalPositiveNumber(args.tare_weight_lbs),
    moisture_pct: asOptionalPositiveNumber(args.moisture_pct),
    test_weight: asOptionalPositiveNumber(args.test_weight),
    dockage_pct: asOptionalPositiveNumber(args.dockage_pct),
    price_per_bushel: asOptionalPositiveNumber(args.price_per_bushel),
    grade: asNonEmptyString(args.grade),
    truck_number: asNonEmptyString(args.truck_number),
    load_number: asNonEmptyString(args.load_number),
    field: asNonEmptyString(args.field),
    notes: asNonEmptyString(args.notes),
    source: parseScaleTicketSource(args.source),
  };
}

async function executeTenantScaleTicketCreate(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeMutatingToolExecutionResult> {
  const normalized = normalizeScaleTicketCreateArgs(args);

  const { data, error } = await admin
    .from("tenant_scale_tickets")
    .insert({
      tenant_id: run.tenant_id,
      customer_id: run.customer_id,
      date: normalized.date,
      crop: normalized.crop,
      elevator: normalized.elevator,
      net_weight_lbs: normalized.net_weight_lbs,
      bushels: normalized.bushels,
      gross_weight_lbs: normalized.gross_weight_lbs,
      tare_weight_lbs: normalized.tare_weight_lbs,
      moisture_pct: normalized.moisture_pct,
      test_weight: normalized.test_weight,
      dockage_pct: normalized.dockage_pct,
      price_per_bushel: normalized.price_per_bushel,
      grade: normalized.grade,
      truck_number: normalized.truck_number,
      load_number: normalized.load_number,
      field: normalized.field,
      notes: normalized.notes,
      source: normalized.source,
    })
    .select("id, date, crop, elevator, net_weight_lbs, bushels, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Failed to create scale ticket via tool execution"
    );
  }

  return {
    output: {
      ticket_id: String((data as { id: string }).id),
      date: String((data as { date: string }).date),
      crop: String((data as { crop: string }).crop),
      elevator: String((data as { elevator: string }).elevator),
      net_weight_lbs: Number((data as { net_weight_lbs: number }).net_weight_lbs),
      bushels: Number((data as { bushels: number }).bushels),
      created_at: String((data as { created_at: string }).created_at),
    },
  };
}

async function executeTenantScaleTicketUpdate(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeMutatingToolExecutionResult> {
  const ticketId = asNonEmptyString(args.ticket_id);
  if (!ticketId || !UUID_PATTERN.test(ticketId)) {
    throw new Error("tenant_scale_ticket_update requires a valid ticket_id UUID");
  }

  const updates: Record<string, unknown> = {};

  const crop = asNonEmptyString(args.crop)?.toLowerCase();
  if (crop) updates.crop = crop;

  const elevator = asNonEmptyString(args.elevator);
  if (elevator) updates.elevator = elevator;

  const date = args.date !== undefined ? parseDateString(args.date) : null;
  if (date) updates.date = date;

  const rawWeight = args.net_weight_lbs ?? args.net_weight;
  let netWeightLbs: number | null = null;
  if (rawWeight !== undefined && rawWeight !== null) {
    netWeightLbs =
      typeof rawWeight === "number" ? rawWeight : parseInt(String(rawWeight), 10);
    if (!Number.isFinite(netWeightLbs) || netWeightLbs <= 0) {
      throw new Error("net_weight_lbs must be a positive integer");
    }
    updates.net_weight_lbs = netWeightLbs;
  }

  const rawBushels = asOptionalPositiveNumber(args.bushels);
  if (rawBushels !== null && rawBushels > 0) {
    updates.bushels = rawBushels;
  } else if (netWeightLbs !== null) {
    const cropForCalc = crop || null;
    if (cropForCalc) {
      const bushelWeight = BUSHEL_WEIGHTS[cropForCalc];
      if (bushelWeight) {
        updates.bushels =
          Math.round((netWeightLbs / bushelWeight) * 100) / 100;
      }
    }
  }

  const grossWeightLbs = asOptionalPositiveNumber(args.gross_weight_lbs);
  if (grossWeightLbs !== null) updates.gross_weight_lbs = grossWeightLbs;

  const tareWeightLbs = asOptionalPositiveNumber(args.tare_weight_lbs);
  if (tareWeightLbs !== null) updates.tare_weight_lbs = tareWeightLbs;

  const moisturePct = asOptionalPositiveNumber(args.moisture_pct);
  if (moisturePct !== null) updates.moisture_pct = moisturePct;

  const testWeight = asOptionalPositiveNumber(args.test_weight);
  if (testWeight !== null) updates.test_weight = testWeight;

  const dockagePct = asOptionalPositiveNumber(args.dockage_pct);
  if (dockagePct !== null) updates.dockage_pct = dockagePct;

  const pricePerBushel = asOptionalPositiveNumber(args.price_per_bushel);
  if (pricePerBushel !== null) updates.price_per_bushel = pricePerBushel;

  const grade = asNonEmptyString(args.grade);
  if (grade !== null) updates.grade = grade;

  const truckNumber = asNonEmptyString(args.truck_number);
  if (truckNumber !== null) updates.truck_number = truckNumber;

  const loadNumber = asNonEmptyString(args.load_number);
  if (loadNumber !== null) updates.load_number = loadNumber;

  const field = asNonEmptyString(args.field);
  if (field !== null) updates.field = field;

  const notes = asNonEmptyString(args.notes);
  if (notes !== null) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    throw new Error("tenant_scale_ticket_update requires at least one field to update");
  }

  const { data, error } = await admin
    .from("tenant_scale_tickets")
    .update(updates)
    .eq("id", ticketId)
    .eq("tenant_id", run.tenant_id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || `Scale ticket ${ticketId} not found or not owned by tenant`
    );
  }

  return {
    output: {
      ticket_id: ticketId,
      updated: true,
    },
  };
}

async function executeTenantScaleTicketDelete(
  admin: SupabaseClient,
  run: TenantRuntimeRun,
  args: Record<string, unknown>
): Promise<RuntimeMutatingToolExecutionResult> {
  const ticketId = asNonEmptyString(args.ticket_id);
  if (!ticketId || !UUID_PATTERN.test(ticketId)) {
    throw new Error("tenant_scale_ticket_delete requires a valid ticket_id UUID");
  }

  const { data, error } = await admin
    .from("tenant_scale_tickets")
    .delete()
    .eq("id", ticketId)
    .eq("tenant_id", run.tenant_id)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || `Scale ticket ${ticketId} not found or not owned by tenant`
    );
  }

  return {
    output: {
      ticket_id: ticketId,
      deleted: true,
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
    case "tenant_scale_ticket_create":
      return executeTenantScaleTicketCreate(admin, input.run, input.args);
    case "tenant_scale_ticket_update":
      return executeTenantScaleTicketUpdate(admin, input.run, input.args);
    case "tenant_scale_ticket_delete":
      return executeTenantScaleTicketDelete(admin, input.run, input.args);
    default:
      throw new Error(`Unsupported runtime mutating tool: ${input.toolKey}`);
  }
}

