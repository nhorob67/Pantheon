import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { getWorkflowRun, normalizeWorkflowRunRow } from "@/lib/queries/workflow-runs";
import { workflowRunRetryStepRequestSchema } from "@/lib/validators/workflow";
import {
  buildWorkflowApprovalInsertRows,
  resolveWorkflowApprovalNodes,
} from "@/lib/workflows/approvals";
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

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = workflowRunRetryStepRequestSchema.safeParse(body);
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
      run.status !== "failed" &&
      run.status !== "canceled" &&
      run.status !== "approval_rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Run must be failed, approval_rejected, or canceled before retrying a step.",
        },
        { status: 409 }
      );
    }

    const { data: step, error: stepError } = await admin
      .from("workflow_run_steps")
      .select("id, node_id, node_type, step_index, attempt, status")
      .eq("id", parsedRequest.data.step_id)
      .eq("run_id", runId)
      .eq("instance_id", id)
      .eq("customer_id", instance.customer_id)
      .maybeSingle();

    if (stepError) {
      return NextResponse.json(
        { error: safeErrorMessage(stepError, "Failed to load workflow run step") },
        { status: 500 }
      );
    }

    if (!step) {
      return NextResponse.json({ error: "Workflow run step not found" }, { status: 404 });
    }

    if (step.status !== "failed" && step.status !== "canceled") {
      return NextResponse.json(
        { error: "Only failed or canceled steps can be retried." },
        { status: 409 }
      );
    }

    const { data: sourceVersion, error: sourceVersionError } = await admin
      .from("workflow_versions")
      .select("graph")
      .eq("workflow_id", run.workflow_id)
      .eq("instance_id", id)
      .eq("customer_id", instance.customer_id)
      .eq("version", run.source_version)
      .maybeSingle();

    if (sourceVersionError) {
      return NextResponse.json(
        {
          error: safeErrorMessage(
            sourceVersionError,
            "Failed to load workflow version snapshot for retry"
          ),
        },
        { status: 500 }
      );
    }

    if (!sourceVersion) {
      return NextResponse.json(
        { error: "Workflow source snapshot was not found for retry." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const approvalNodes = resolveWorkflowApprovalNodes(
      sourceVersion.graph,
      new Date(nowIso)
    );
    const requiresApproval = approvalNodes.length > 0;

    const { data: newRunRow, error: createRunError } = await admin
      .from("workflow_runs")
      .insert({
        workflow_id: run.workflow_id,
        instance_id: id,
        customer_id: instance.customer_id,
        trigger_type: "retry",
        status: requiresApproval ? "awaiting_approval" : "queued",
        source_version: run.source_version,
        retry_of_run_id: run.id,
        requested_by: user.id,
        input_payload: {
          ...(parsedRequest.data.input || {}),
          retry_step_id: step.id,
          retry_from_run_id: run.id,
          retry_from_step_index: step.step_index,
        },
        metadata: {
          queued_at: nowIso,
          retry_reason: parsedRequest.data.reason || null,
          runtime_state: requiresApproval
            ? "awaiting_approval"
            : "pending_runtime_bridge",
          approval_required: requiresApproval,
          approval_node_ids: approvalNodes.map((node) => node.node_id),
        },
      })
      .select(RUN_SELECT_COLUMNS)
      .single();

    if (createRunError || !newRunRow) {
      return NextResponse.json(
        { error: safeErrorMessage(createRunError, "Failed to create retry run") },
        { status: 500 }
      );
    }

    await admin.from("workflow_run_steps").insert({
      run_id: newRunRow.id,
      workflow_id: run.workflow_id,
      instance_id: id,
      customer_id: instance.customer_id,
      node_id: step.node_id,
      node_type: step.node_type,
      step_index: step.step_index,
      attempt: 1,
      status: "pending",
      metadata: {
        seeded_from: "retry_step",
        previous_step_id: step.id,
        previous_attempt: step.attempt,
      },
    });

    if (requiresApproval) {
      const { error: approvalInsertError } = await admin
        .from("workflow_approvals")
        .insert(
          buildWorkflowApprovalInsertRows({
            runId: newRunRow.id,
            workflowId: run.workflow_id,
            instanceId: id,
            customerId: instance.customer_id,
            approvalNodes,
            source: "retry_step",
          })
        );

      if (approvalInsertError) {
        const failedAt = new Date().toISOString();
        const newRunMetadata = normalizeObject(
          (newRunRow as { metadata?: unknown }).metadata
        );
        await admin
          .from("workflow_runs")
          .update({
            status: "failed",
            error_message: "Failed to initialize workflow approvals for retry run.",
            completed_at: failedAt,
            metadata: {
              ...newRunMetadata,
              runtime_state: "approval_init_failed",
              approval_init_failed_at: failedAt,
              approval_init_error: safeErrorMessage(
                approvalInsertError,
                "Failed to create workflow approvals"
              ),
            },
          })
          .eq("id", newRunRow.id)
          .eq("instance_id", id)
          .eq("customer_id", instance.customer_id)
          .in("status", ["queued", "awaiting_approval"]);

        await admin
          .from("workflow_run_steps")
          .update({
            status: "canceled",
            completed_at: failedAt,
            error_message: "Retry run failed before approvals were initialized.",
          })
          .eq("run_id", newRunRow.id)
          .eq("instance_id", id)
          .in("status", ["pending", "running"]);

        return NextResponse.json(
          {
            error: safeErrorMessage(
              approvalInsertError,
              "Failed to create workflow approvals for retry run"
            ),
          },
          { status: 500 }
        );
      }
    }

    const newRun = normalizeWorkflowRunRow(
      newRunRow as Parameters<typeof normalizeWorkflowRunRow>[0]
    );

    auditLog({
      action: "workflow.run.retry_step",
      actor: user.email || user.id,
      resource_type: "workflow_run",
      resource_id: newRun.id,
      details: {
        customer_id: instance.customer_id,
        instance_id: id,
        workflow_id: run.workflow_id,
        retry_of_run_id: run.id,
        retried_step_id: step.id,
        retried_node_id: step.node_id,
        retried_step_index: step.step_index,
        reason: parsedRequest.data.reason || null,
        approval_required: requiresApproval,
        approval_count: approvalNodes.length,
      },
    });

    return NextResponse.json(
      {
        run: newRun,
        awaiting_approval: requiresApproval,
        message: requiresApproval
          ? "Retry run created and awaiting approval before dispatch."
          : "Retry run queued. Runtime dispatch processor will pick this up and begin execution.",
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to retry workflow step") },
      { status: 500 }
    );
  }
}
