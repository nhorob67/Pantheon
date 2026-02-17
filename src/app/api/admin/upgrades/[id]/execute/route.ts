import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { recordTelemetryEvent } from "@/lib/queries/extensibility";

type LogStatus = "pending" | "in_progress" | "completed" | "failed";

async function countLogsByStatus(
  upgradeId: string,
  status: LogStatus
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("upgrade_instance_logs")
    .select("id", { count: "exact", head: true })
    .eq("upgrade_id", upgradeId)
    .eq("status", status);

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
}

async function syncUpgradeProgress(upgradeId: string) {
  const [pending, inProgress, completed, failed] = await Promise.all([
    countLogsByStatus(upgradeId, "pending"),
    countLogsByStatus(upgradeId, "in_progress"),
    countLogsByStatus(upgradeId, "completed"),
    countLogsByStatus(upgradeId, "failed"),
  ]);

  const remaining = pending + inProgress;
  const finalStatus = remaining === 0 ? (failed > 0 ? "failed" : "completed") : "in_progress";

  const admin = createAdminClient();
  const { error } = await admin
    .from("upgrade_operations")
    .update({
      status: finalStatus,
      completed_instances: completed,
      failed_instances: failed,
      completed_at: remaining === 0 ? new Date().toISOString() : null,
    })
    .eq("id", upgradeId);

  if (error) {
    throw new Error(error.message);
  }

  return { status: finalStatus, remaining, completed, failed };
}

interface ClaimedLog {
  id: string;
  instance_id: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestStartedAt = Date.now();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: upgrade, error: upgradeError } = await admin
    .from("upgrade_operations")
    .select("*")
    .eq("id", id)
    .single();

  if (upgradeError || !upgrade) {
    return NextResponse.json({ error: "Upgrade not found" }, { status: 404 });
  }

  if (upgrade.status === "completed" || upgrade.status === "canceled") {
    return NextResponse.json(
      { error: `Upgrade is already ${upgrade.status}` },
      { status: 400 }
    );
  }

  if (upgrade.status === "pending") {
    await admin
      .from("upgrade_operations")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  const { data: claimedLogsData, error: claimError } = await admin.rpc(
    "claim_upgrade_instance_logs",
    {
      p_upgrade_id: id,
      p_limit: upgrade.concurrency,
    }
  );

  if (claimError) {
    return NextResponse.json(
      { error: safeErrorMessage(claimError, "Failed to claim upgrade logs") },
      { status: 500 }
    );
  }

  const claimedLogs = (claimedLogsData || []) as ClaimedLog[];
  if (claimedLogs.length === 0) {
    const progress = await syncUpgradeProgress(id);
    return NextResponse.json({
      status: progress.status,
      processed: 0,
      completed: 0,
      failed: 0,
      remaining: progress.remaining,
    });
  }

  const coolify = getCoolifyClient();

  const uniqueInstanceIds = Array.from(
    new Set(claimedLogs.map((log) => log.instance_id))
  );
  const { data: instances, error: instancesError } = await admin
    .from("instances")
    .select("id, coolify_uuid, customer_id")
    .in("id", uniqueInstanceIds);

  if (instancesError) {
    await admin
      .from("upgrade_instance_logs")
      .update({ status: "pending" })
      .in(
        "id",
        claimedLogs.map((log) => log.id)
      )
      .eq("status", "in_progress");

    return NextResponse.json(
      { error: safeErrorMessage(instancesError, "Failed to load instances for upgrade") },
      { status: 500 }
    );
  }

  const instanceById = new Map(
    (instances || []).map((instance) => [instance.id, instance])
  );

  let completedInBatch = 0;
  let failedInBatch = 0;

  for (const log of claimedLogs) {
    const instance = instanceById.get(log.instance_id);

    if (!instance?.coolify_uuid) {
      await admin
        .from("upgrade_instance_logs")
        .update({
          status: "skipped",
          error_message: "No Coolify UUID",
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      continue;
    }

    try {
      await coolify.restartApplication(instance.coolify_uuid);

      await admin
        .from("instances")
        .update({ openclaw_version: upgrade.target_version })
        .eq("id", instance.id);

      await admin
        .from("upgrade_instance_logs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      completedInBatch++;

      try {
        await recordTelemetryEvent(admin, {
          customerId: instance.customer_id,
          instanceId: instance.id,
          eventType: "upgrade.execute.instance",
          toolName: "coolify.restartApplication",
          latencyMs: Date.now() - requestStartedAt,
          metadata: {
            upgrade_id: id,
            target_version: upgrade.target_version,
            status: "completed",
          },
        });
      } catch {
        // Best-effort telemetry only.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      await admin
        .from("upgrade_instance_logs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      failedInBatch++;

      try {
        await recordTelemetryEvent(admin, {
          customerId: instance.customer_id,
          instanceId: instance.id,
          eventType: "upgrade.execute.instance",
          toolName: "coolify.restartApplication",
          latencyMs: Date.now() - requestStartedAt,
          errorClass: err instanceof Error ? err.name : "unknown_error",
          metadata: {
            upgrade_id: id,
            target_version: upgrade.target_version,
            status: "failed",
            error: message,
          },
        });
      } catch {
        // Best-effort telemetry only.
      }
    }
  }

  const progress = await syncUpgradeProgress(id);

  auditLog({
    action: "upgrade.execute",
    actor: user.email!,
    resource_type: "upgrade",
    resource_id: id,
    details: { processed: claimedLogs.length, completed: completedInBatch, failed: failedInBatch },
  });

  return NextResponse.json({
    status: progress.status,
    processed: claimedLogs.length,
    completed: completedInBatch,
    failed: failedInBatch,
    remaining: progress.remaining,
  });
}
