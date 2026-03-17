import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import {
  cancelDelegationTree,
  getTenantRuntimeRunById,
  releaseAsyncDelegationBudgetReservation,
  transitionTenantRuntimeRun,
} from "@/lib/runtime/tenant-runtime-queue";

async function requireAdminAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdmin(user?.email);
}

// POST /api/admin/runs/[runId] — operator run controls
export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const authorized = await requireAdminAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { runId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (!["terminate", "replay", "resume", "cancel_tree"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be: terminate, replay, resume, or cancel_tree" },
      { status: 400 }
    );
  }

  const run = await getTenantRuntimeRunById(admin, runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (action === "terminate") {
    if (!["queued", "running", "awaiting_approval"].includes(run.status)) {
      return NextResponse.json(
        { error: `Cannot terminate run in status "${run.status}"` },
        { status: 409 }
      );
    }

    await transitionTenantRuntimeRun(admin, run, "cancel");
    if (run.parent_run_id) {
      await releaseAsyncDelegationBudgetReservation(admin, {
        parentRunId: run.parent_run_id,
        childRunId: run.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      action: "terminate",
      runId,
      message: "Run canceled successfully",
    });
  }

  if (action === "cancel_tree") {
    let canceledCount = 0;

    if (["queued", "running", "awaiting_approval"].includes(run.status)) {
      await transitionTenantRuntimeRun(admin, run, "cancel");
      canceledCount += 1;
    }

    canceledCount += await cancelDelegationTree(admin, runId);

    return NextResponse.json({
      ok: true,
      action: "cancel_tree",
      runId,
      canceledCount,
      message:
        canceledCount > 0
          ? `Canceled ${canceledCount} run${canceledCount === 1 ? "" : "s"} in the delegation tree`
          : "No active runs remained in the delegation tree",
    });
  }

  if (action === "replay") {
    if (run.status !== "failed" && run.status !== "completed" && run.status !== "canceled") {
      return NextResponse.json(
        { error: `Cannot replay run in status "${run.status}". Must be failed, canceled, or completed.` },
        { status: 409 }
      );
    }

    const { data: newRun, error: insertError } = await admin
      .from("tenant_runtime_runs")
      .insert({
        tenant_id: run.tenant_id,
        customer_id: run.customer_id,
        run_kind: run.run_kind,
        source: run.source,
        status: "queued",
        payload: run.payload,
        metadata: {
          ...(run.metadata ?? {}),
          replayed_from: runId,
          replayed_at: new Date().toISOString(),
        },
        queued_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newRun) {
      return NextResponse.json({ error: "Failed to create replay run" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "replay",
      originalRunId: runId,
      newRunId: newRun.id,
      message: "Run replayed and queued",
    });
  }

  if (action === "resume") {
    if (run.status !== "failed") {
      return NextResponse.json(
        { error: `Cannot resume run in status "${run.status}". Must be failed.` },
        { status: 409 }
      );
    }

    const { data: newRun, error: insertError } = await admin
      .from("tenant_runtime_runs")
      .insert({
        tenant_id: run.tenant_id,
        customer_id: run.customer_id,
        run_kind: run.run_kind,
        source: run.source,
        status: "queued",
        payload: run.payload,
        metadata: {
          ...(run.metadata ?? {}),
          resumed_from: runId,
          resumed_at: new Date().toISOString(),
        },
        queued_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newRun) {
      return NextResponse.json({ error: "Failed to create resumed run" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "resume",
      originalRunId: runId,
      newRunId: newRun.id,
      message: "Run resumed and queued",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
