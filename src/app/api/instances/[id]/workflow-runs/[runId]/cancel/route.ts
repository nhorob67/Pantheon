import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { getWorkflowRun, normalizeWorkflowRunRow } from "@/lib/queries/workflow-runs";
import { workflowRunCancelRequestSchema } from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const RUN_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, trigger_type, status, source_version, retry_of_run_id, requested_by, runtime_correlation_id, input_payload, output_payload, error_message, metadata, started_at, completed_at, canceled_at, created_at, updated_at";

function getCustomerUserId(
  customers: { user_id: string } | { user_id: string }[] | null
): string | null {
  if (!customers) {
    return null;
  }

  if (Array.isArray(customers)) {
    return customers[0]?.user_id ?? null;
  }

  return customers.user_id ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id, runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeConfigUpdateRateLimit(user.id);
  if (rateLimit === "unavailable") {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (rateLimit === "blocked") {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      body = JSON.parse(rawBody);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = workflowRunCancelRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    const run = await getWorkflowRun(admin, id, instance.customer_id, runId);

    if (!run) {
      return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
    }

    if (
      run.status === "succeeded" ||
      run.status === "failed" ||
      run.status === "approval_rejected" ||
      run.status === "canceled"
    ) {
      return NextResponse.json(
        { error: "Run is already finished and cannot be canceled." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const metadata = {
      ...run.metadata,
      cancel_requested_by: user.id,
      cancel_requested_at: nowIso,
      cancel_reason:
        parsedRequest.data.reason && parsedRequest.data.reason.length > 0
          ? parsedRequest.data.reason
          : run.metadata.cancel_reason ?? null,
    };

    const updates: Record<string, unknown> = {
      metadata,
    };

    let action = "workflow.run.cancel_requested";

    if (run.status === "queued" || run.status === "awaiting_approval") {
      updates.status = "canceled";
      updates.canceled_at = nowIso;
      updates.completed_at = nowIso;
      action = "workflow.run.canceled";
    } else if (
      run.status === "running" ||
      run.status === "paused_waiting_approval"
    ) {
      updates.status = "cancel_requested";
    } else if (run.status === "cancel_requested") {
      updates.status = "cancel_requested";
    }

    const { data: updatedRunRow, error: updateError } = await admin
      .from("workflow_runs")
      .update(updates)
      .eq("id", runId)
      .eq("instance_id", id)
      .eq("customer_id", instance.customer_id)
      .select(RUN_SELECT_COLUMNS)
      .single();

    if (updateError || !updatedRunRow) {
      return NextResponse.json(
        { error: safeErrorMessage(updateError, "Failed to cancel workflow run") },
        { status: 500 }
      );
    }

    const updatedRun = normalizeWorkflowRunRow(
      updatedRunRow as Parameters<typeof normalizeWorkflowRunRow>[0]
    );

    auditLog({
      action,
      actor: user.email || user.id,
      resource_type: "workflow_run",
      resource_id: updatedRun.id,
      details: {
        customer_id: instance.customer_id,
        instance_id: id,
        workflow_id: updatedRun.workflow_id,
        status: updatedRun.status,
        reason: parsedRequest.data.reason || null,
      },
    });

    return NextResponse.json({ run: updatedRun });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to cancel workflow run") },
      { status: 500 }
    );
  }
}
