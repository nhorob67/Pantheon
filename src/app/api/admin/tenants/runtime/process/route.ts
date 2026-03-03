import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { resolveCustomerFeatureFlag } from "@/lib/queries/extensibility";
import {
  claimTenantRuntimeRuns,
  patchTenantRuntimeRunMetadata,
  transitionTenantRuntimeRun,
} from "@/lib/runtime/tenant-runtime-queue";
import { computeTenantRuntimeRetryDelaySeconds } from "@/lib/runtime/tenant-runtime-retry";
import { executeTenantRuntimeRun } from "@/lib/runtime/tenant-runtime-orchestrator";
import {
  createDiscordRuntimeDispatchWorker,
  noOpDiscordRuntimeWorker,
} from "@/lib/runtime/tenant-runtime-worker";
import { createTenantAiWorker } from "@/lib/ai/tenant-ai-worker";
import {
  TENANT_DISCORD_CANARY_DISPATCH_FLAG_KEY,
  TENANT_AI_WORKER_FLAG_KEY,
} from "@/lib/runtime/tenant-runtime-gates";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;
const DEFAULT_LEASE_SECONDS = 90;

function resolveDiscordRateLimitRetrySeconds(result: Record<string, unknown>): number | null {
  const value = result.discord_retry_after_seconds;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.ceil(value);
}

function clampBatch(value: string | null): number {
  if (!value) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(parsed)));
}

async function isAuthorized(request: Request): Promise<boolean> {
  const expectedTokens = [
    process.env.TENANT_RUNTIME_PROCESSOR_TOKEN,
    process.env.WORKFLOW_RUN_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-tenant-runtime-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!(user && isAdmin(user.email));
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const batch = clampBatch(url.searchParams.get("batch"));
  const workerId = url.searchParams.get("worker_id") || "tenant-runtime-worker";

  try {
    const admin = createAdminClient();
    const dispatchWorker = createDiscordRuntimeDispatchWorker(admin);
    const aiWorker = createTenantAiWorker(admin);
    const dispatchFlagCache = new Map<string, boolean>();
    const aiWorkerFlagCache = new Map<string, boolean>();
    const claims = await claimTenantRuntimeRuns(admin, {
      workerId,
      limit: batch,
      leaseSeconds: DEFAULT_LEASE_SECONDS,
      runKind: "discord_runtime",
    });

    if (claims.length === 0) {
      return NextResponse.json({
        claimed: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        dead_lettered: 0,
        awaiting_approval: 0,
        worker: workerId,
      });
    }

    let completed = 0;
    let failed = 0;
    let awaitingApproval = 0;
    let retried = 0;
    let deadLettered = 0;

    for (const claim of claims) {
      try {
        if (!dispatchFlagCache.has(claim.run.customer_id)) {
          const [dispatchEnabled, aiEnabled] = await Promise.all([
            resolveCustomerFeatureFlag(
              admin,
              claim.run.customer_id,
              TENANT_DISCORD_CANARY_DISPATCH_FLAG_KEY
            ),
            resolveCustomerFeatureFlag(
              admin,
              claim.run.customer_id,
              TENANT_AI_WORKER_FLAG_KEY
            ),
          ]);
          dispatchFlagCache.set(claim.run.customer_id, dispatchEnabled);
          aiWorkerFlagCache.set(claim.run.customer_id, aiEnabled);
        }

        const aiEnabled = aiWorkerFlagCache.get(claim.run.customer_id) === true;
        const dispatchEnabled = dispatchFlagCache.get(claim.run.customer_id) === true;
        const worker = aiEnabled
          ? aiWorker
          : dispatchEnabled
            ? dispatchWorker
            : noOpDiscordRuntimeWorker;
        const outcome = await executeTenantRuntimeRun(admin, worker, claim.run);

        if (outcome.finalStatus === "completed") {
          completed += 1;
        } else if (outcome.finalStatus === "awaiting_approval") {
          awaitingApproval += 1;
        } else {
          if (outcome.run.attempt_count < outcome.run.max_attempts) {
            const baseDelaySeconds = computeTenantRuntimeRetryDelaySeconds(
              outcome.run.attempt_count
            );
            const discordRateLimitDelay = resolveDiscordRateLimitRetrySeconds(
              outcome.run.result
            );
            const retryDelaySeconds = Math.max(baseDelaySeconds, discordRateLimitDelay ?? 0);
            const nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();

            await transitionTenantRuntimeRun(admin, outcome.run, "retry", {
              workerId: null,
              lockExpiresAt: nextRetryAt,
              metadataPatch: {
                retry_scheduled: true,
                retry_delay_seconds: retryDelaySeconds,
                retry_delay_source:
                  discordRateLimitDelay !== null && retryDelaySeconds === discordRateLimitDelay
                    ? "discord_rate_limit"
                    : "exponential_backoff",
                next_retry_at: nextRetryAt,
              },
            });
            retried += 1;
          } else {
            await patchTenantRuntimeRunMetadata(admin, outcome.run, {
              dead_lettered: true,
              dead_lettered_at: new Date().toISOString(),
              dead_letter_reason: "max_attempts_exhausted",
            });
            failed += 1;
            deadLettered += 1;
          }
        }
      } catch (error) {
        try {
          const failedRun = await transitionTenantRuntimeRun(admin, claim.run, "fail", {
            workerId,
            errorMessage: safeErrorMessage(error, "Tenant runtime worker failed"),
            metadataPatch: {
              orchestrator_error: true,
            },
          });

          if (failedRun.attempt_count < failedRun.max_attempts) {
            const retryDelaySeconds = computeTenantRuntimeRetryDelaySeconds(
              failedRun.attempt_count
            );
            const nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();
            await transitionTenantRuntimeRun(admin, failedRun, "retry", {
              workerId: null,
              lockExpiresAt: nextRetryAt,
              metadataPatch: {
                retry_scheduled: true,
                retry_delay_seconds: retryDelaySeconds,
                next_retry_at: nextRetryAt,
                retry_reason: "orchestrator_error",
              },
            });
            retried += 1;
          } else {
            await patchTenantRuntimeRunMetadata(admin, failedRun, {
              dead_lettered: true,
              dead_lettered_at: new Date().toISOString(),
              dead_letter_reason: "max_attempts_exhausted",
            });
            failed += 1;
            deadLettered += 1;
          }
        } catch {
          failed += 1;
          deadLettered += 1;
        }
      }
    }

    return NextResponse.json({
      claimed: claims.length,
      completed,
      failed,
      retried,
      dead_lettered: deadLettered,
      awaiting_approval: awaitingApproval,
      worker: workerId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: safeErrorMessage(error, "Failed to process tenant runtime queue"),
      },
      { status: 500 }
    );
  }
}
