import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { createWorkflowRunRequestSchema } from "@/lib/validators/workflow";
import { normalizeWorkflowRunRow } from "@/lib/queries/workflow-runs";
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

function resolveTriggerNodeId(graph: unknown): string | null {
  if (!graph || typeof graph !== "object") {
    return null;
  }

  const nodes = (graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return null;
  }

  const triggerNode = nodes
    .filter(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        (node as { type?: unknown }).type === "trigger" &&
        typeof (node as { id?: unknown }).id === "string"
    )
    .map((node) => node as { id: string })
    .sort((a, b) => a.id.localeCompare(b.id))[0];

  return triggerNode?.id ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id, workflowId } = await params;
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

  const parsedRequest = createWorkflowRunRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }

  if (parsedRequest.data.trigger_type === "retry") {
    return NextResponse.json(
      { error: "Use retry-step endpoint for retry-triggered runs." },
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

  const { data: workflow, error: workflowError } = await admin
    .from("workflow_definitions")
    .select("id, name, status, published_version, draft_graph")
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .maybeSingle();

  if (workflowError) {
    return NextResponse.json(
      { error: safeErrorMessage(workflowError, "Failed to load workflow") },
      { status: 500 }
    );
  }

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  if (workflow.status !== "published" || !workflow.published_version) {
    return NextResponse.json(
      { error: "Only published workflows can be run." },
      { status: 409 }
    );
  }

  const { data: publishedVersion, error: publishedVersionError } = await admin
    .from("workflow_versions")
    .select("graph")
    .eq("workflow_id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .eq("version", workflow.published_version)
    .maybeSingle();

  if (publishedVersionError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          publishedVersionError,
          "Failed to load published workflow snapshot"
        ),
      },
      { status: 500 }
    );
  }

  const nowIso = new Date().toISOString();
  const effectiveGraph = publishedVersion?.graph ?? workflow.draft_graph;
  const approvalNodes = resolveWorkflowApprovalNodes(
    effectiveGraph,
    new Date(nowIso)
  );
  const requiresApproval = approvalNodes.length > 0;

  const { data: runRow, error: runError } = await admin
    .from("workflow_runs")
    .insert({
      workflow_id: workflowId,
      instance_id: id,
      customer_id: instance.customer_id,
      trigger_type: parsedRequest.data.trigger_type,
      status: requiresApproval ? "awaiting_approval" : "queued",
      source_version: workflow.published_version,
      requested_by: user.id,
      input_payload: parsedRequest.data.input || {},
      metadata: {
        ...(parsedRequest.data.metadata || {}),
        queued_at: nowIso,
        runtime_state: requiresApproval
          ? "awaiting_approval"
          : "pending_runtime_bridge",
        approval_required: requiresApproval,
        approval_node_ids: approvalNodes.map((node) => node.node_id),
      },
    })
    .select(RUN_SELECT_COLUMNS)
    .single();

  if (runError || !runRow) {
    return NextResponse.json(
      { error: safeErrorMessage(runError, "Failed to create workflow run") },
      { status: 500 }
    );
  }

  const triggerNodeId = resolveTriggerNodeId(effectiveGraph);

  if (triggerNodeId) {
    await admin.from("workflow_run_steps").insert({
      run_id: runRow.id,
      workflow_id: workflowId,
      instance_id: id,
      customer_id: instance.customer_id,
      node_id: triggerNodeId,
      node_type: "trigger",
      step_index: 0,
      attempt: 1,
      status: "pending",
      metadata: {
        seeded_from: "run_request",
      },
    });
  }

  if (requiresApproval) {
    const { error: approvalInsertError } = await admin
      .from("workflow_approvals")
      .insert(
        buildWorkflowApprovalInsertRows({
          runId: runRow.id,
          workflowId,
          instanceId: id,
          customerId: instance.customer_id,
          approvalNodes,
          source: "run_request",
        })
      );

    if (approvalInsertError) {
      const failedAt = new Date().toISOString();
      const runMetadata = normalizeObject((runRow as { metadata?: unknown }).metadata);
      await admin
        .from("workflow_runs")
        .update({
          status: "failed",
          error_message: "Failed to initialize workflow approvals for this run.",
          completed_at: failedAt,
          metadata: {
            ...runMetadata,
            runtime_state: "approval_init_failed",
            approval_init_failed_at: failedAt,
            approval_init_error: safeErrorMessage(
              approvalInsertError,
              "Failed to create workflow approvals"
            ),
          },
        })
        .eq("id", runRow.id)
        .eq("instance_id", id)
        .eq("customer_id", instance.customer_id)
        .in("status", ["queued", "awaiting_approval"]);

      await admin
        .from("workflow_run_steps")
        .update({
          status: "canceled",
          completed_at: failedAt,
          error_message: "Run failed before approvals were initialized.",
        })
        .eq("run_id", runRow.id)
        .eq("instance_id", id)
        .in("status", ["pending", "running"]);

      return NextResponse.json(
        {
          error: safeErrorMessage(
            approvalInsertError,
            "Failed to create workflow approvals for run"
          ),
        },
        { status: 500 }
      );
    }
  }

  const run = normalizeWorkflowRunRow(
    runRow as Parameters<typeof normalizeWorkflowRunRow>[0]
  );

  auditLog({
    action: "workflow.run.requested",
    actor: user.email || user.id,
    resource_type: "workflow_run",
    resource_id: run.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      workflow_id: workflowId,
      workflow_name: workflow.name,
      source_version: run.source_version,
      trigger_type: run.trigger_type,
      runtime_state: run.metadata.runtime_state || null,
      approval_required: requiresApproval,
      approval_count: approvalNodes.length,
    },
  });

  return NextResponse.json(
    {
      run,
      queued: !requiresApproval,
      awaiting_approval: requiresApproval,
      message: requiresApproval
        ? "Run created and awaiting approval before dispatch."
        : "Run queued. Runtime dispatch processor will pick this up and begin execution.",
    },
    { status: 202 }
  );
}
