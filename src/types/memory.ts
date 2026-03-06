export const MEMORY_MODE_VALUES = ["native_only", "hybrid_local_vault"] as const;
export type MemoryMode = (typeof MEMORY_MODE_VALUES)[number];

export const MEMORY_CAPTURE_LEVEL_VALUES = [
  "conservative",
  "standard",
  "aggressive",
] as const;
export type MemoryCaptureLevel = (typeof MEMORY_CAPTURE_LEVEL_VALUES)[number];

export const MEMORY_OPERATION_TYPE_VALUES = ["checkpoint", "compress"] as const;
export type MemoryOperationType = (typeof MEMORY_OPERATION_TYPE_VALUES)[number];

export const MEMORY_OPERATION_STATUS_VALUES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export type MemoryOperationStatus = (typeof MEMORY_OPERATION_STATUS_VALUES)[number];

export interface TenantMemorySettings {
  id: string;
  tenant_id: string;
  customer_id: string;
  mode: MemoryMode;
  capture_level: MemoryCaptureLevel;
  retention_days: number;
  exclude_categories: string[];
  auto_checkpoint: boolean;
  auto_compress: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryOperation {
  id: string;
  tenant_id: string;
  customer_id: string;
  operation_type: MemoryOperationType;
  status: MemoryOperationStatus;
  requested_by: string | null;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  attempt_count: number;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MEMORY_SETTINGS: Pick<
  TenantMemorySettings,
  | "mode"
  | "capture_level"
  | "retention_days"
  | "exclude_categories"
  | "auto_checkpoint"
  | "auto_compress"
> = {
  mode: "native_only",
  capture_level: "standard",
  retention_days: 365,
  exclude_categories: [],
  auto_checkpoint: true,
  auto_compress: true,
};

export function buildDefaultMemorySettings(
  tenantId: string,
  customerId: string
): Omit<TenantMemorySettings, "id"> {
  const now = new Date().toISOString();

  return {
    tenant_id: tenantId,
    customer_id: customerId,
    mode: DEFAULT_MEMORY_SETTINGS.mode,
    capture_level: DEFAULT_MEMORY_SETTINGS.capture_level,
    retention_days: DEFAULT_MEMORY_SETTINGS.retention_days,
    exclude_categories: DEFAULT_MEMORY_SETTINGS.exclude_categories,
    auto_checkpoint: DEFAULT_MEMORY_SETTINGS.auto_checkpoint,
    auto_compress: DEFAULT_MEMORY_SETTINGS.auto_compress,
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}
