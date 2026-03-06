import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { buildDefaultMemorySettings, type TenantMemorySettings, type MemoryOperationType } from "@/types/memory";
import type { UpdateTenantMemorySettingsRequest } from "@/lib/validators/memory";

const MEMORY_SETTINGS_SELECT =
  "tenant_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at";
const MEMORY_OPERATION_SELECT = "id, operation_type, status, queued_at";

interface TenantMemoryOperationRow {
  id: string;
  operation_type: MemoryOperationType;
  status: "queued" | "running" | "completed" | "failed";
  queued_at: string;
}

export interface TenantMemoryMutationContext {
  tenantId: string;
  customerId: string;
}

export interface TenantMemorySettingsResult {
  settings: Omit<TenantMemorySettings, "id">;
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
  customerId: string
): TenantMemoryMutationContext {
  return {
    tenantId,
    customerId,
  };
}

export async function getTenantMemorySettings(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext
): Promise<TenantMemorySettingsResult> {
  const { data, error } = await admin
    .from("tenant_memory_settings")
    .select(MEMORY_SETTINGS_SELECT)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (error) {
    throw new TenantMemoryServiceError(
      500,
      safeErrorMessage(error, "Failed to load tenant memory settings")
    );
  }

  if (data) {
    return {
      settings: data as Omit<TenantMemorySettings, "id">,
      source: "stored",
    };
  }

  return {
    settings: buildDefaultMemorySettings(context.tenantId, context.customerId),
    source: "default",
  };
}

export async function updateTenantMemorySettings(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext,
  payload: UpdateTenantMemorySettingsRequest,
  updatedBy: string
): Promise<Omit<TenantMemorySettings, "id">> {
  const { data, error } = await admin
    .from("tenant_memory_settings")
    .upsert(
      {
        tenant_id: context.tenantId,
        customer_id: context.customerId,
        ...payload,
        updated_by: updatedBy,
      },
      { onConflict: "tenant_id" }
    )
    .select(MEMORY_SETTINGS_SELECT)
    .single();

  if (error || !data) {
    throw new TenantMemoryServiceError(
      500,
      safeErrorMessage(error, "Failed to update tenant memory settings")
    );
  }

  return data as Omit<TenantMemorySettings, "id">;
}

export async function queueTenantMemoryOperation(
  admin: SupabaseClient,
  context: TenantMemoryMutationContext,
  operationType: MemoryOperationType,
  requestedBy: string,
  reason?: string
): Promise<TenantMemoryOperationRow> {
  const input =
    typeof reason === "string" && reason.trim().length > 0
      ? { reason: reason.trim() }
      : {};

  const { data, error } = await admin
    .from("tenant_memory_operations")
    .insert({
      tenant_id: context.tenantId,
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

  return data as TenantMemoryOperationRow;
}
