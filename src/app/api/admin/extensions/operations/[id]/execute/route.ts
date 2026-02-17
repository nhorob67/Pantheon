import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  applyOperationToInstallation,
  claimExtensionOperationTargets,
  completeExtensionOperationTarget,
  failExtensionOperationTarget,
  getExtensionOperation,
  getExtensionOperationTargetWithInstallation,
  isFeatureFlagEnabledOrDefaultTrue,
  isKillSwitchEnabled,
  markExtensionOperationInProgress,
  recordTelemetryEvent,
  syncExtensionOperationProgress,
} from "@/lib/queries/extensibility";
import type { ExtensionOperation } from "@/types/extensibility";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const TARGET_MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 300;
const EXECUTE_KILL_SWITCH_KEY = "extensions.operation_execute_disabled";
const EXECUTE_FEATURE_FLAG_KEY = "extensions.operation_execute";

function parseBatchSize(request: Request): number {
  const rawValue = new URL(request.url).searchParams.get("batch_size");
  if (!rawValue) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > MAX_BATCH_SIZE) {
    return MAX_BATCH_SIZE;
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableTargetError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("connection reset") ||
    normalized.includes("network") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const batchSize = parseBatchSize(request);
  const requestStartedAt = Date.now();
  let telemetryOperation: ExtensionOperation | null = null;

  async function emitOperationTelemetry(
    eventType: string,
    metadata: Record<string, unknown>,
    errorClass?: string
  ): Promise<void> {
    if (!telemetryOperation?.customer_id) {
      return;
    }

    try {
      await recordTelemetryEvent(admin, {
        customerId: telemetryOperation.customer_id,
        instanceId: telemetryOperation.instance_id,
        eventType,
        toolName: "claim_extension_operation_targets",
        latencyMs: Date.now() - requestStartedAt,
        errorClass,
        metadata: {
          operation_id: telemetryOperation.id,
          operation_type: telemetryOperation.operation_type,
          batch_size: batchSize,
          ...metadata,
        },
      });
    } catch {
      // Best-effort telemetry only.
    }
  }

  try {
    const operation = await getExtensionOperation(admin, id);
    telemetryOperation = operation;
    if (!operation) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    const executeDisabled = await isKillSwitchEnabled(admin, EXECUTE_KILL_SWITCH_KEY);
    if (executeDisabled) {
      return NextResponse.json(
        { error: "Extension operation execution is temporarily disabled" },
        { status: 503 }
      );
    }

    if (operation.customer_id) {
      const executeEnabled = await isFeatureFlagEnabledOrDefaultTrue(
        admin,
        operation.customer_id,
        EXECUTE_FEATURE_FLAG_KEY
      );

      if (!executeEnabled) {
        return NextResponse.json(
          { error: "Extension operation execution is disabled for this customer" },
          { status: 403 }
        );
      }
    }

    if (operation.status === "completed" || operation.status === "canceled") {
      return NextResponse.json(
        { error: `Operation is already ${operation.status}` },
        { status: 400 }
      );
    }

    if (operation.status === "pending") {
      await markExtensionOperationInProgress(admin, id);
    }

    const claimedTargets = await claimExtensionOperationTargets(admin, id, batchSize);
    if (claimedTargets.length === 0) {
      const progress = await syncExtensionOperationProgress(admin, id);
      await emitOperationTelemetry("extension_operation.execute.batch", {
        processed: 0,
        completed: 0,
        failed: 0,
        status: progress.status,
        remaining: progress.remaining,
      });

      return NextResponse.json({
        status: progress.status,
        processed: 0,
        completed: 0,
        failed: 0,
        remaining: progress.remaining,
      });
    }

    let completedInBatch = 0;
    let failedInBatch = 0;

    for (const claimed of claimedTargets) {
      try {
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= TARGET_MAX_ATTEMPTS; attempt++) {
          try {
            const target = await getExtensionOperationTargetWithInstallation(admin, claimed.id);
            if (!target) {
              throw new Error(`Operation target not found: ${claimed.id}`);
            }

            // For the first runner iteration we only support installation-bound targets.
            if (!target.installation_id || !target.installation) {
              throw new Error(`Operation target ${claimed.id} has no installation record`);
            }

            await applyOperationToInstallation(
              admin,
              target.installation_id,
              operation.operation_type,
              target.target_version_id
            );
            await completeExtensionOperationTarget(admin, claimed.id);

            lastError = null;
            break;
          } catch (attemptError) {
            lastError = attemptError;
            const shouldRetry =
              attempt < TARGET_MAX_ATTEMPTS && isRetryableTargetError(attemptError);

            if (!shouldRetry) {
              break;
            }

            const backoffMs = BACKOFF_BASE_MS * 2 ** (attempt - 1);
            await sleep(backoffMs);
          }
        }

        if (lastError) {
          throw lastError;
        }

        completedInBatch++;
      } catch (targetError) {
        failedInBatch++;

        try {
          await failExtensionOperationTarget(admin, claimed.id, targetError);
        } catch (markError) {
          // Ensure target lands in terminal failed state if helper update fails.
          await admin
            .from("extension_operation_targets")
            .update({
              status: "failed",
              last_error: safeErrorMessage(markError, "Failed to mark target failure"),
              completed_at: new Date().toISOString(),
            })
            .eq("id", claimed.id)
            .eq("status", "in_progress");
        }
      }
    }

    const progress = await syncExtensionOperationProgress(admin, id);
    await emitOperationTelemetry("extension_operation.execute.batch", {
      processed: claimedTargets.length,
      completed: completedInBatch,
      failed: failedInBatch,
      status: progress.status,
      remaining: progress.remaining,
    });

    auditLog({
      action: "extension_operation.execute",
      actor: user.email!,
      resource_type: "extension_operation",
      resource_id: id,
      details: {
        batch_size: batchSize,
        processed: claimedTargets.length,
        completed: completedInBatch,
        failed: failedInBatch,
        status: progress.status,
        remaining: progress.remaining,
      },
    });

    return NextResponse.json({
      status: progress.status,
      processed: claimedTargets.length,
      completed: completedInBatch,
      failed: failedInBatch,
      remaining: progress.remaining,
    });
  } catch (error) {
    await emitOperationTelemetry(
      "extension_operation.execute.error",
      {},
      error instanceof Error ? error.name : "unknown_error"
    );

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to execute extension operation") },
      { status: 500 }
    );
  }
}
