import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  ClaimedExtensionOperationTarget,
  ExtensionInstallation,
  ExtensionOperation,
  ExtensionOperationProgress,
  ExtensionOperationStatus,
  ExtensionOperationTargetStatus,
  ExtensionOperationType,
} from "@/types/extensibility";

const MAX_TARGET_ERROR_LENGTH = 2000;

function normalizeTargetError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_TARGET_ERROR_LENGTH);
}

async function countTargetsByStatus(
  admin: SupabaseClient,
  operationId: string,
  status: ExtensionOperationTargetStatus
): Promise<number> {
  const { count, error } = await admin
    .from("extension_operation_targets")
    .select("id", { count: "exact", head: true })
    .eq("operation_id", operationId)
    .eq("status", status);

  if (error) {
    throw new Error(
      safeErrorMessage(error, `Failed to count extension targets with status '${status}'`)
    );
  }

  return count || 0;
}

export async function getExtensionOperation(
  admin: SupabaseClient,
  operationId: string
): Promise<ExtensionOperation | null> {
  const { data, error } = await admin
    .from("extension_operations")
    .select("*")
    .eq("id", operationId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load extension operation"));
  }

  return (data || null) as ExtensionOperation | null;
}

export async function markExtensionOperationInProgress(
  admin: SupabaseClient,
  operationId: string
): Promise<void> {
  const { error } = await admin
    .from("extension_operations")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("id", operationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to mark extension operation in progress"));
  }
}

export async function claimExtensionOperationTargets(
  admin: SupabaseClient,
  operationId: string,
  limit: number
): Promise<ClaimedExtensionOperationTarget[]> {
  const { data, error } = await admin.rpc(
    "claim_extension_operation_targets",
    {
      p_operation_id: operationId,
      p_limit: limit,
    }
  );

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to claim extension operation targets"));
  }

  return ((data || []) as ClaimedExtensionOperationTarget[]).map((row) => ({
    id: row.id,
    installation_id: row.installation_id,
    target_version_id: row.target_version_id,
  }));
}

interface ExtensionOperationTargetWithInstallation {
  id: string;
  installation_id: string | null;
  target_version_id: string | null;
  status: ExtensionOperationTargetStatus;
  installation: Pick<ExtensionInstallation, "id" | "install_status" | "version_id"> | null;
}

export async function getExtensionOperationTargetWithInstallation(
  admin: SupabaseClient,
  targetId: string
): Promise<ExtensionOperationTargetWithInstallation | null> {
  const { data, error } = await admin
    .from("extension_operation_targets")
    .select("id, installation_id, target_version_id, status, extension_installations(id, install_status, version_id)")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load extension operation target"));
  }

  if (!data) {
    return null;
  }

  const rawInstallation = (
    data as {
      extension_installations:
        | Pick<ExtensionInstallation, "id" | "install_status" | "version_id">
        | Pick<ExtensionInstallation, "id" | "install_status" | "version_id">[]
        | null;
    }
  ).extension_installations;

  const installation = Array.isArray(rawInstallation)
    ? rawInstallation[0] || null
    : rawInstallation;

  return {
    id: data.id,
    installation_id: data.installation_id,
    target_version_id: data.target_version_id,
    status: data.status as ExtensionOperationTargetStatus,
    installation,
  };
}

export async function applyOperationToInstallation(
  admin: SupabaseClient,
  installationId: string,
  operationType: ExtensionOperationType,
  targetVersionId: string | null
): Promise<void> {
  if (operationType === "sync_catalog") {
    return;
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { last_error: null };

  if (operationType === "install" || operationType === "upgrade") {
    patch.install_status = "installed";
    patch.installed_at = nowIso;
    if (targetVersionId) {
      patch.version_id = targetVersionId;
    }
  } else if (operationType === "rollback") {
    patch.install_status = "rolled_back";
    patch.installed_at = nowIso;
    if (targetVersionId) {
      patch.version_id = targetVersionId;
    }
  } else if (operationType === "remove") {
    patch.install_status = "removed";
    patch.health_status = "unknown";
    patch.version_id = null;
  }

  const { error } = await admin
    .from("extension_installations")
    .update(patch)
    .eq("id", installationId);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to update extension installation"));
  }
}

export async function completeExtensionOperationTarget(
  admin: SupabaseClient,
  targetId: string
): Promise<void> {
  const { error } = await admin
    .from("extension_operation_targets")
    .update({
      status: "completed",
      last_error: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to mark target completed"));
  }
}

export async function failExtensionOperationTarget(
  admin: SupabaseClient,
  targetId: string,
  error: unknown
): Promise<void> {
  const { error: updateError } = await admin
    .from("extension_operation_targets")
    .update({
      status: "failed",
      last_error: normalizeTargetError(error),
      completed_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (updateError) {
    throw new Error(safeErrorMessage(updateError, "Failed to mark target failed"));
  }
}

export async function syncExtensionOperationProgress(
  admin: SupabaseClient,
  operationId: string
): Promise<ExtensionOperationProgress> {
  const [pending, inProgress, completed, failed, skipped] = await Promise.all([
    countTargetsByStatus(admin, operationId, "pending"),
    countTargetsByStatus(admin, operationId, "in_progress"),
    countTargetsByStatus(admin, operationId, "completed"),
    countTargetsByStatus(admin, operationId, "failed"),
    countTargetsByStatus(admin, operationId, "skipped"),
  ]);

  const remaining = pending + inProgress;
  const status: ExtensionOperationStatus =
    remaining === 0 ? (failed > 0 ? "failed" : "completed") : "in_progress";

  const { data: operation, error: operationError } = await admin
    .from("extension_operations")
    .select("metadata")
    .eq("id", operationId)
    .maybeSingle();

  if (operationError) {
    throw new Error(safeErrorMessage(operationError, "Failed to load extension operation metadata"));
  }

  const currentMetadata =
    (operation?.metadata as Record<string, unknown> | null | undefined) || {};
  const nextMetadata = {
    ...currentMetadata,
    progress: {
      pending,
      in_progress: inProgress,
      completed,
      failed,
      skipped,
      remaining,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: updateError } = await admin
    .from("extension_operations")
    .update({
      status,
      completed_at: remaining === 0 ? new Date().toISOString() : null,
      metadata: nextMetadata,
    })
    .eq("id", operationId);

  if (updateError) {
    throw new Error(safeErrorMessage(updateError, "Failed to sync extension operation progress"));
  }

  return {
    status,
    pending,
    in_progress: inProgress,
    completed,
    failed,
    skipped,
    remaining,
  };
}

export async function isKillSwitchEnabled(
  admin: SupabaseClient,
  switchKey: string
): Promise<boolean> {
  const { data, error } = await admin.rpc(
    "is_kill_switch_enabled",
    { p_switch_key: switchKey }
  );

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve kill switch"));
  }

  return data === true;
}

export async function resolveCustomerFeatureFlag(
  admin: SupabaseClient,
  customerId: string,
  flagKey: string
): Promise<boolean> {
  const { data, error } = await admin.rpc(
    "resolve_customer_feature_flag",
    {
      p_customer_id: customerId,
      p_flag_key: flagKey,
    }
  );

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve customer feature flag"));
  }

  return data === true;
}

export async function isFeatureFlagEnabledOrDefaultTrue(
  admin: SupabaseClient,
  customerId: string,
  flagKey: string
): Promise<boolean> {
  const normalizedFlagKey = flagKey.trim().toLowerCase();
  const { data: flag, error } = await admin
    .from("feature_flags")
    .select("id")
    .eq("flag_key", normalizedFlagKey)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to query feature flag"));
  }

  if (!flag) {
    return true;
  }

  return resolveCustomerFeatureFlag(admin, customerId, normalizedFlagKey);
}

interface TelemetryEventInput {
  customerId: string;
  instanceId?: string | null;
  eventType: string;
  toolName?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostCents?: number;
  errorClass?: string;
  metadata?: Record<string, unknown>;
}

export async function recordTelemetryEvent(
  admin: SupabaseClient,
  input: TelemetryEventInput
): Promise<void> {
  const { error } = await admin
    .from("telemetry_events")
    .insert({
      customer_id: input.customerId,
      instance_id: input.instanceId ?? null,
      event_type: input.eventType,
      tool_name: input.toolName || null,
      latency_ms: input.latencyMs ?? null,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      estimated_cost_cents: input.estimatedCostCents ?? 0,
      error_class: input.errorClass || null,
      metadata: input.metadata || {},
    });

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to record telemetry event"));
  }
}
