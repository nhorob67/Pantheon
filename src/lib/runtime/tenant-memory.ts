import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { buildDefaultMemorySettings, type MemoryOperationType } from "@/types/memory";
import type { UpdateInstanceMemorySettingsRequest } from "@/lib/validators/memory";

const MEMORY_SETTINGS_SELECT =
  "instance_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at";
const MEMORY_OPERATION_SELECT = "id, operation_type, status, queued_at";

interface LegacyMemorySettingsRow {
  instance_id: string;
  customer_id: string;
  mode: "native_only" | "hybrid_local_vault";
  capture_level: "conservative" | "standard" | "aggressive";
  retention_days: number;
  exclude_categories: string[];
  auto_checkpoint: boolean;
  auto_compress: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyMemoryOperationRow {
  id: string;
  operation_type: MemoryOperationType;
  status: "queued" | "running" | "completed" | "failed";
  queued_at: string;
}

export interface TenantMemoryMutationContext {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export interface TenantMemorySettingsResult {
  settings: LegacyMemorySettingsRow;
  source: "stored" | "default";
}

export class TenantMemoryServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function buildTenantMemoryContext(
  tenantId: string,
  customerId: string,
  legacyInstanceId: string | null
): TenantMemoryMutationContext {
  return {
    tenantId,
    customerId,
    legacyInstanceId,
  };
}

function requireLegacyInstanceId(context: TenantMemoryMutationContext): string {
  if (!context.legacyInstanceId) {
    throw new TenantMemoryServiceError(
      409,
      "No active legacy instance mapping available for tenant memory operations"
    );
  }

  return context.legacyInstanceId;
}

export async function getTenantMemorySettings(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext
): Promise<TenantMemorySettingsResult> {
  const legacyInstanceId = requireLegacyInstanceId(context);
  const { data, error } = await admin
    .from("instance_memory_settings")
    .select(MEMORY_SETTINGS_SELECT)
    .eq("instance_id", legacyInstanceId)
    .maybeSingle();

  if (error) {
    throw new TenantMemoryServiceError(
      500,
      safeErrorMessage(error, "Failed to load tenant memory settings")
    );
  }

  if (data) {
    return {
      settings: data as LegacyMemorySettingsRow,
      source: "stored",
    };
  }

  return {
    settings: buildDefaultMemorySettings(legacyInstanceId, context.customerId),
    source: "default",
  };
}

export async function updateTenantMemorySettings(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext,
  payload: UpdateInstanceMemorySettingsRequest,
  updatedBy: string
): Promise<LegacyMemorySettingsRow> {
  const legacyInstanceId = requireLegacyInstanceId(context);
  const { data, error } = await admin
    .from("instance_memory_settings")
    .upsert(
      {
        instance_id: legacyInstanceId,
        customer_id: context.customerId,
        ...payload,
        updated_by: updatedBy,
      },
      { onConflict: "instance_id" }
    )
    .select(MEMORY_SETTINGS_SELECT)
    .single();

  if (error || !data) {
    throw new TenantMemoryServiceError(
      500,
      safeErrorMessage(error, "Failed to update tenant memory settings")
    );
  }

  return data as LegacyMemorySettingsRow;
}

export async function queueTenantMemoryOperation(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext,
  operationType: MemoryOperationType,
  requestedBy: string,
  reason?: string
): Promise<LegacyMemoryOperationRow> {
  const legacyInstanceId = requireLegacyInstanceId(context);
  const input =
    typeof reason === "string" && reason.trim().length > 0
      ? { reason: reason.trim() }
      : {};

  const { data, error } = await admin
    .from("memory_operations")
    .insert({
      instance_id: legacyInstanceId,
      customer_id: context.customerId,
      operation_type: operationType,
      status: "queued",
      requested_by: requestedBy,
      input,
    })
    .select(MEMORY_OPERATION_SELECT)
    .single();

  if (error || !data) {
    throw new TenantMemoryServiceError(
      500,
      safeErrorMessage(error, "Failed to queue tenant memory operation")
    );
  }

  return data as LegacyMemoryOperationRow;
}
