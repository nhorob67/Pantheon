import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  ExtensionRolloutRing,
  ExtensionRolloutStatus,
  ExtensionUpdateRollout,
} from "@/types/extensibility";

const ROLLING_SOURCE_RINGS: ExtensionRolloutRing[] = [
  "canary",
  "standard",
  "delayed",
];

const ELIGIBLE_INSTALL_STATUSES = ["installed", "rolled_back"];

interface CatalogVersionTarget {
  id: string;
  item_id: string;
  version: string;
}

interface InstallationCandidate {
  id: string;
  version_id: string | null;
}

interface RolloutBatchSizes {
  canary: number;
  standard: number;
  delayed: number;
}

export class RolloutInputError extends Error {}

function assignRings(
  installationIds: string[],
  batchSizes: RolloutBatchSizes
): { installation_id: string; ring: ExtensionRolloutRing }[] {
  const total = installationIds.length;
  const canaryCount = Math.min(batchSizes.canary, total);
  const standardCount = Math.min(batchSizes.standard, Math.max(total - canaryCount, 0));

  return installationIds.map((installationId, index) => {
    if (index < canaryCount) {
      return { installation_id: installationId, ring: "canary" };
    }
    if (index < canaryCount + standardCount) {
      return { installation_id: installationId, ring: "standard" };
    }
    return { installation_id: installationId, ring: "delayed" };
  });
}

async function loadTargetVersion(
  admin: SupabaseClient,
  targetVersionId: string
): Promise<CatalogVersionTarget> {
  const { data, error } = await admin
    .from("extension_catalog_versions")
    .select("id, item_id, version")
    .eq("id", targetVersionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load target extension version")
    );
  }

  if (!data) {
    throw new RolloutInputError("Target version not found");
  }

  return data as CatalogVersionTarget;
}

async function loadEligibleInstallations(
  admin: SupabaseClient,
  params: {
    itemId: string;
    targetVersionId: string;
    customerId?: string | null;
  }
): Promise<InstallationCandidate[]> {
  let query = admin
    .from("extension_installations")
    .select("id, version_id")
    .eq("item_id", params.itemId)
    .in("install_status", ELIGIBLE_INSTALL_STATUSES)
    .order("updated_at", { ascending: true });

  if (params.customerId) {
    query = query.eq("customer_id", params.customerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load eligible extension installations")
    );
  }

  const candidates = ((data || []) as InstallationCandidate[]).filter(
    (row) => row.version_id !== params.targetVersionId
  );

  if (candidates.length === 0) {
    throw new RolloutInputError("No eligible installations found for rollout");
  }

  return candidates;
}

export async function createExtensionUpdateRollout(
  admin: SupabaseClient,
  params: {
    customerId?: string | null;
    itemId?: string;
    targetVersionId: string;
    initiatedBy: string;
    batchSizes: RolloutBatchSizes;
    gatePolicy: Record<string, unknown>;
    notes?: string;
  }
): Promise<{
  rollout: ExtensionUpdateRollout;
  targetVersion: CatalogVersionTarget;
  totalTargets: number;
  ringCounts: Record<ExtensionRolloutRing, number>;
}> {
  const targetVersion = await loadTargetVersion(admin, params.targetVersionId);
  const itemId = params.itemId || targetVersion.item_id;

  if (params.itemId && params.itemId !== targetVersion.item_id) {
    throw new RolloutInputError(
      "Provided item_id does not match the target version item"
    );
  }

  const installations = await loadEligibleInstallations(admin, {
    itemId,
    targetVersionId: params.targetVersionId,
    customerId: params.customerId,
  });

  const assignments = assignRings(
    installations.map((installation) => installation.id),
    params.batchSizes
  );
  const installationById = new Map(
    installations.map((installation) => [installation.id, installation])
  );
  const ringCounts: Record<ExtensionRolloutRing, number> = {
    canary: assignments.filter((assignment) => assignment.ring === "canary").length,
    standard: assignments.filter((assignment) => assignment.ring === "standard").length,
    delayed: assignments.filter((assignment) => assignment.ring === "delayed").length,
  };

  const { data: rollout, error: rolloutError } = await admin
    .from("extension_update_rollouts")
    .insert({
      customer_id: params.customerId || null,
      item_id: itemId,
      target_version_id: targetVersion.id,
      initiated_by: params.initiatedBy,
      status: "pending",
      current_ring: "canary",
      ring_order: ROLLING_SOURCE_RINGS,
      ring_config: {
        canary: { batch_size: params.batchSizes.canary },
        standard: { batch_size: params.batchSizes.standard },
        delayed: { batch_size: params.batchSizes.delayed },
      },
      gate_config: params.gatePolicy,
      notes: params.notes || null,
      metadata: {
        eligible_installation_count: installations.length,
        ring_counts: ringCounts,
      },
    })
    .select("*")
    .single();

  if (rolloutError || !rollout) {
    throw new Error(
      safeErrorMessage(rolloutError, "Failed to create extension rollout")
    );
  }

  const { error: targetError } = await admin
    .from("extension_update_rollout_targets")
    .insert(
      assignments.map((assignment) => ({
        rollout_id: rollout.id,
        installation_id: assignment.installation_id,
        ring: assignment.ring,
        status: "pending",
        metadata: {
          from_version_id:
            installationById.get(assignment.installation_id)?.version_id || null,
        },
      }))
    );

  if (targetError) {
    throw new Error(
      safeErrorMessage(targetError, "Failed to create rollout targets")
    );
  }

  return {
    rollout: rollout as ExtensionUpdateRollout,
    targetVersion,
    totalTargets: assignments.length,
    ringCounts,
  };
}

export async function transitionExtensionRolloutStatus(
  admin: SupabaseClient,
  params: {
    rolloutId: string;
    allowedCurrentStatuses: ExtensionRolloutStatus[];
    nextStatus: ExtensionRolloutStatus;
    actor: string;
    reason?: string;
  }
): Promise<ExtensionUpdateRollout | null> {
  const { data: rollout, error: loadError } = await admin
    .from("extension_update_rollouts")
    .select("*")
    .eq("id", params.rolloutId)
    .maybeSingle();

  if (loadError) {
    throw new Error(safeErrorMessage(loadError, "Failed to load extension rollout"));
  }

  if (!rollout) {
    return null;
  }

  const currentStatus = rollout.status as ExtensionRolloutStatus;
  if (!params.allowedCurrentStatuses.includes(currentStatus)) {
    throw new RolloutInputError(
      `Rollout is '${currentStatus}' and cannot transition to '${params.nextStatus}'`
    );
  }

  const nowIso = new Date().toISOString();
  const metadata = (rollout.metadata as Record<string, unknown> | null) || {};
  const existingHistory = Array.isArray(metadata.status_history)
    ? metadata.status_history
    : [];

  const nextMetadata = {
    ...metadata,
    status_history: [
      ...existingHistory,
      {
        from: currentStatus,
        to: params.nextStatus,
        at: nowIso,
        actor: params.actor,
        reason: params.reason || null,
      },
    ],
  };

  const patch: Record<string, unknown> = {
    status: params.nextStatus,
    metadata: nextMetadata,
  };

  if (params.nextStatus === "in_progress" && !rollout.started_at) {
    patch.started_at = nowIso;
  }

  if (
    params.nextStatus === "completed" ||
    params.nextStatus === "failed" ||
    params.nextStatus === "canceled" ||
    params.nextStatus === "halted"
  ) {
    patch.completed_at = nowIso;
  }

  if (params.nextStatus === "paused") {
    patch.completed_at = null;
  }

  const { data: updated, error: updateError } = await admin
    .from("extension_update_rollouts")
    .update(patch)
    .eq("id", rollout.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(
      safeErrorMessage(updateError, "Failed to update rollout status")
    );
  }

  return updated as ExtensionUpdateRollout;
}

export async function markPendingRolloutTargetsSkipped(
  admin: SupabaseClient,
  rolloutId: string
): Promise<void> {
  const { error } = await admin
    .from("extension_update_rollout_targets")
    .update({
      status: "skipped",
      completed_at: new Date().toISOString(),
    })
    .eq("rollout_id", rolloutId)
    .in("status", ["pending", "in_progress"]);

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to mark rollout targets as skipped")
    );
  }
}

interface RolloutTargetMetricRow {
  id: string;
  installation_id: string;
  status: string;
  latency_ms: number | null;
  timeout_count: number;
  hard_error_count: number;
  metadata: Record<string, unknown>;
}

interface RolloutGatePolicy {
  max_failure_rate_pct: number;
  max_p95_latency_ms: number;
  max_timeout_rate_pct: number;
  max_hard_error_rate_pct: number;
}

export interface ExtensionRolloutGateEvaluation {
  rollout_id: string;
  rollout_status: ExtensionRolloutStatus;
  total_targets: number;
  processed_targets: number;
  pending_targets: number;
  in_progress_targets: number;
  completed_targets: number;
  failed_targets: number;
  rolled_back_targets: number;
  skipped_targets: number;
  failure_rate_pct: number;
  timeout_rate_pct: number;
  hard_error_rate_pct: number;
  p95_latency_ms: number | null;
  gate_thresholds: RolloutGatePolicy;
  breached_rules: string[];
  gate_breached: boolean;
}

function normalizeGateNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function parseGatePolicy(gateConfig: Record<string, unknown> | null): RolloutGatePolicy {
  return {
    max_failure_rate_pct: normalizeGateNumber(
      gateConfig?.max_failure_rate_pct,
      10
    ),
    max_p95_latency_ms: normalizeGateNumber(gateConfig?.max_p95_latency_ms, 10000),
    max_timeout_rate_pct: normalizeGateNumber(gateConfig?.max_timeout_rate_pct, 5),
    max_hard_error_rate_pct: normalizeGateNumber(
      gateConfig?.max_hard_error_rate_pct,
      3
    ),
  };
}

function percentile(values: number[], targetPercentile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rawIndex = Math.ceil((targetPercentile / 100) * sorted.length) - 1;
  const clampedIndex = Math.min(
    sorted.length - 1,
    Math.max(0, rawIndex)
  );
  return sorted[clampedIndex];
}

export async function evaluateExtensionRolloutHealthGates(
  admin: SupabaseClient,
  rolloutId: string
): Promise<ExtensionRolloutGateEvaluation | null> {
  const { data: rollout, error: rolloutError } = await admin
    .from("extension_update_rollouts")
    .select("id, status, gate_config")
    .eq("id", rolloutId)
    .maybeSingle();

  if (rolloutError) {
    throw new Error(
      safeErrorMessage(rolloutError, "Failed to load rollout for gate evaluation")
    );
  }

  if (!rollout) {
    return null;
  }

  const { data: targets, error: targetsError } = await admin
    .from("extension_update_rollout_targets")
    .select("id, installation_id, status, latency_ms, timeout_count, hard_error_count, metadata")
    .eq("rollout_id", rollout.id);

  if (targetsError) {
    throw new Error(
      safeErrorMessage(targetsError, "Failed to load rollout targets for gate evaluation")
    );
  }

  const rows = (targets || []) as RolloutTargetMetricRow[];
  const totalTargets = rows.length;
  const pendingTargets = rows.filter((row) => row.status === "pending").length;
  const inProgressTargets = rows.filter((row) => row.status === "in_progress").length;
  const completedTargets = rows.filter((row) => row.status === "completed").length;
  const failedTargets = rows.filter((row) => row.status === "failed").length;
  const rolledBackTargets = rows.filter((row) => row.status === "rolled_back").length;
  const skippedTargets = rows.filter((row) => row.status === "skipped").length;
  const processedTargets = completedTargets + failedTargets + rolledBackTargets;

  const timeoutTargets = rows.filter((row) => row.timeout_count > 0).length;
  const hardErrorTargets = rows.filter((row) => row.hard_error_count > 0).length;
  const latencySamples = rows
    .map((row) => row.latency_ms)
    .filter((value): value is number => typeof value === "number");

  const failureRatePct =
    processedTargets > 0 ? (failedTargets / processedTargets) * 100 : 0;
  const timeoutRatePct =
    processedTargets > 0 ? (timeoutTargets / processedTargets) * 100 : 0;
  const hardErrorRatePct =
    processedTargets > 0 ? (hardErrorTargets / processedTargets) * 100 : 0;
  const p95LatencyMs = percentile(latencySamples, 95);

  const gatePolicy = parseGatePolicy(
    (rollout.gate_config as Record<string, unknown> | null) || null
  );
  const breachedRules: string[] = [];

  if (failureRatePct > gatePolicy.max_failure_rate_pct) {
    breachedRules.push("max_failure_rate_pct");
  }
  if (timeoutRatePct > gatePolicy.max_timeout_rate_pct) {
    breachedRules.push("max_timeout_rate_pct");
  }
  if (hardErrorRatePct > gatePolicy.max_hard_error_rate_pct) {
    breachedRules.push("max_hard_error_rate_pct");
  }
  if (
    typeof p95LatencyMs === "number" &&
    p95LatencyMs > gatePolicy.max_p95_latency_ms
  ) {
    breachedRules.push("max_p95_latency_ms");
  }

  return {
    rollout_id: rollout.id,
    rollout_status: rollout.status as ExtensionRolloutStatus,
    total_targets: totalTargets,
    processed_targets: processedTargets,
    pending_targets: pendingTargets,
    in_progress_targets: inProgressTargets,
    completed_targets: completedTargets,
    failed_targets: failedTargets,
    rolled_back_targets: rolledBackTargets,
    skipped_targets: skippedTargets,
    failure_rate_pct: failureRatePct,
    timeout_rate_pct: timeoutRatePct,
    hard_error_rate_pct: hardErrorRatePct,
    p95_latency_ms: p95LatencyMs,
    gate_thresholds: gatePolicy,
    breached_rules: breachedRules,
    gate_breached: breachedRules.length > 0,
  };
}

interface RollbackCandidateTarget {
  installation_id: string;
  status: string;
  metadata: Record<string, unknown>;
}

interface RollbackCandidateInstallation {
  id: string;
  customer_id: string;
  instance_id: string | null;
}

export async function queueAutomaticRollbackForRollout(
  admin: SupabaseClient,
  rolloutId: string,
  actor: string
): Promise<number> {
  const { data: targets, error: targetsError } = await admin
    .from("extension_update_rollout_targets")
    .select("installation_id, status, metadata")
    .eq("rollout_id", rolloutId)
    .in("status", ["completed", "failed", "in_progress"]);

  if (targetsError) {
    throw new Error(
      safeErrorMessage(targetsError, "Failed to load rollout rollback candidates")
    );
  }

  const rollbackTargets = ((targets || []) as RollbackCandidateTarget[]).filter(
    (target) => {
      const fromVersionId = target.metadata?.from_version_id;
      return typeof fromVersionId === "string" && fromVersionId.length > 0;
    }
  );

  if (rollbackTargets.length === 0) {
    return 0;
  }

  const installationIds = Array.from(
    new Set(rollbackTargets.map((target) => target.installation_id))
  );
  const { data: installations, error: installationsError } = await admin
    .from("extension_installations")
    .select("id, customer_id, instance_id")
    .in("id", installationIds);

  if (installationsError) {
    throw new Error(
      safeErrorMessage(
        installationsError,
        "Failed to load installations for automatic rollback"
      )
    );
  }

  const installationById = new Map(
    ((installations || []) as RollbackCandidateInstallation[]).map((installation) => [
      installation.id,
      installation,
    ])
  );

  let queuedCount = 0;
  for (const target of rollbackTargets) {
    const installation = installationById.get(target.installation_id);
    if (!installation) {
      continue;
    }

    const fromVersionId = target.metadata.from_version_id as string;
    const { data: operation, error: operationError } = await admin
      .from("extension_operations")
      .insert({
        operation_type: "rollback",
        scope_type: installation.instance_id ? "instance" : "customer",
        status: "pending",
        customer_id: installation.customer_id,
        instance_id: installation.instance_id,
        requested_by: actor,
        metadata: {
          source: "rollout.auto_rollback",
          rollout_id: rolloutId,
          installation_id: installation.id,
          target_version_id: fromVersionId,
        },
      })
      .select("id")
      .single();

    if (operationError || !operation) {
      throw new Error(
        safeErrorMessage(operationError, "Failed to queue rollback operation")
      );
    }

    const { error: operationTargetError } = await admin
      .from("extension_operation_targets")
      .insert({
        operation_id: operation.id,
        installation_id: installation.id,
        target_version_id: fromVersionId,
        status: "pending",
      });

    if (operationTargetError) {
      throw new Error(
        safeErrorMessage(
          operationTargetError,
          "Failed to queue rollback operation target"
        )
      );
    }

    const { error: installPatchError } = await admin
      .from("extension_installations")
      .update({
        install_status: "rollback_pending",
        last_error: null,
      })
      .eq("id", installation.id);

    if (installPatchError) {
      throw new Error(
        safeErrorMessage(
          installPatchError,
          "Failed to mark installation for rollback"
        )
      );
    }

    queuedCount += 1;
  }

  return queuedCount;
}

export async function evaluateAndEnforceExtensionRolloutGates(
  admin: SupabaseClient,
  rolloutId: string,
  actor: string
): Promise<{
  evaluation: ExtensionRolloutGateEvaluation | null;
  halted: boolean;
  autoRollbackQueued: number;
}> {
  const evaluation = await evaluateExtensionRolloutHealthGates(admin, rolloutId);
  if (!evaluation) {
    return { evaluation: null, halted: false, autoRollbackQueued: 0 };
  }

  if (!evaluation.gate_breached) {
    return { evaluation, halted: false, autoRollbackQueued: 0 };
  }

  if (
    evaluation.rollout_status === "canceled" ||
    evaluation.rollout_status === "completed" ||
    evaluation.rollout_status === "failed" ||
    evaluation.rollout_status === "halted"
  ) {
    return { evaluation, halted: false, autoRollbackQueued: 0 };
  }

  await transitionExtensionRolloutStatus(admin, {
    rolloutId,
    allowedCurrentStatuses: ["pending", "in_progress", "paused"],
    nextStatus: "halted",
    actor,
    reason: `Health gate breached: ${evaluation.breached_rules.join(", ")}`,
  });

  await markPendingRolloutTargetsSkipped(admin, rolloutId);
  const autoRollbackQueued = await queueAutomaticRollbackForRollout(
    admin,
    rolloutId,
    actor
  );

  const { data: rollout, error: rolloutError } = await admin
    .from("extension_update_rollouts")
    .select("id, metadata")
    .eq("id", rolloutId)
    .maybeSingle();

  if (rolloutError) {
    throw new Error(
      safeErrorMessage(rolloutError, "Failed to load halted rollout metadata")
    );
  }

  if (rollout) {
    const metadata = (rollout.metadata as Record<string, unknown> | null) || {};
    const nextMetadata = {
      ...metadata,
      last_gate_evaluation: evaluation,
      auto_rollback: {
        queued_operations: autoRollbackQueued,
        evaluated_at: new Date().toISOString(),
      },
    };

    const { error: metadataUpdateError } = await admin
      .from("extension_update_rollouts")
      .update({ metadata: nextMetadata })
      .eq("id", rollout.id);

    if (metadataUpdateError) {
      throw new Error(
        safeErrorMessage(
          metadataUpdateError,
          "Failed to persist rollout gate evaluation metadata"
        )
      );
    }
  }

  return {
    evaluation,
    halted: true,
    autoRollbackQueued,
  };
}
