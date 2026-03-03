import type { SupabaseClient } from "@supabase/supabase-js";

function safeRuntimeErrorMessage(error: unknown, fallback: string): string {
  const real = error instanceof Error ? error.message : String(error);
  console.error("[ERROR]", real);
  return process.env.NODE_ENV === "development" ? real : fallback;
}

export interface TenantDataGovernancePolicy {
  export_retention_days: number;
  memory_tombstone_retention_days: number;
  deletion_guard_enabled: boolean;
  hard_delete_requires_owner: boolean;
}

export interface TenantDataGovernancePolicyUpdate {
  export_retention_days?: number;
  memory_tombstone_retention_days?: number;
  deletion_guard_enabled?: boolean;
  hard_delete_requires_owner?: boolean;
}

const DEFAULT_POLICY: TenantDataGovernancePolicy = {
  export_retention_days: 7,
  memory_tombstone_retention_days: 365,
  deletion_guard_enabled: true,
  hard_delete_requires_owner: true,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function sanitizeTenantDataGovernancePolicy(
  value: unknown
): TenantDataGovernancePolicy {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    export_retention_days: clampNumber(
      raw.export_retention_days,
      DEFAULT_POLICY.export_retention_days,
      1,
      30
    ),
    memory_tombstone_retention_days: clampNumber(
      raw.memory_tombstone_retention_days,
      DEFAULT_POLICY.memory_tombstone_retention_days,
      7,
      3650
    ),
    deletion_guard_enabled:
      typeof raw.deletion_guard_enabled === "boolean"
        ? raw.deletion_guard_enabled
        : DEFAULT_POLICY.deletion_guard_enabled,
    hard_delete_requires_owner:
      typeof raw.hard_delete_requires_owner === "boolean"
        ? raw.hard_delete_requires_owner
        : DEFAULT_POLICY.hard_delete_requires_owner,
  };
}

export function buildTenantDataGovernanceMetadataPatch(
  existingMetadata: unknown,
  policy: TenantDataGovernancePolicy,
  updatedBy: string,
  updatedAtIso: string
): Record<string, unknown> {
  const root =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};

  root.data_governance = {
    ...policy,
    updated_by: updatedBy,
    updated_at: updatedAtIso,
  };

  return root;
}

export async function resolveTenantDataGovernancePolicy(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantDataGovernancePolicy> {
  const { data, error } = await admin
    .from("tenants")
    .select("metadata")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeRuntimeErrorMessage(error, "Failed to resolve tenant data governance policy")
    );
  }

  const metadata =
    data && typeof data.metadata === "object" && data.metadata !== null
      ? (data.metadata as Record<string, unknown>)
      : {};
  const nested = metadata.data_governance;
  return sanitizeTenantDataGovernancePolicy(nested);
}

export async function updateTenantDataGovernancePolicy(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    updates: TenantDataGovernancePolicyUpdate;
    updatedBy: string;
  }
): Promise<TenantDataGovernancePolicy> {
  const { data, error } = await admin
    .from("tenants")
    .select("id, metadata")
    .eq("id", input.tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeRuntimeErrorMessage(
        error,
        "Failed to load tenant data governance metadata for update"
      )
    );
  }
  if (!data) {
    throw new Error("Tenant not found");
  }

  const current = sanitizeTenantDataGovernancePolicy(
    (data.metadata as Record<string, unknown> | null)?.data_governance
  );
  const next = sanitizeTenantDataGovernancePolicy({
    ...current,
    ...input.updates,
  });

  const nowIso = new Date().toISOString();
  const metadata = buildTenantDataGovernanceMetadataPatch(
    data.metadata,
    next,
    input.updatedBy,
    nowIso
  );

  const { error: updateError } = await admin
    .from("tenants")
    .update({
      metadata,
      updated_at: nowIso,
    })
    .eq("id", input.tenantId);

  if (updateError) {
    throw new Error(
      safeRuntimeErrorMessage(updateError, "Failed to update tenant data governance policy")
    );
  }

  return next;
}
