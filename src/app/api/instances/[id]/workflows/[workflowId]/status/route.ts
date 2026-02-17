import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { workflowStatusMutationRequestSchema } from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const WORKFLOW_SELECT_COLUMNS =
  "id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at";

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

export async function PATCH(
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

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsedRequest = workflowStatusMutationRequestSchema.safeParse(rawBody);
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

  const { data: existingWorkflow, error: existingWorkflowError } = await admin
    .from("workflow_definitions")
    .select("id, status, published_version")
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .maybeSingle();

  if (existingWorkflowError) {
    return NextResponse.json(
      { error: safeErrorMessage(existingWorkflowError, "Failed to load workflow") },
      { status: 500 }
    );
  }

  if (!existingWorkflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const nextStatus = parsedRequest.data.archived
    ? "archived"
    : existingWorkflow.published_version
      ? "published"
      : "draft";

  const { data: updatedWorkflowRow, error: updateError } = await admin
    .from("workflow_definitions")
    .update({
      status: nextStatus,
      updated_by: user.id,
    })
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .select(WORKFLOW_SELECT_COLUMNS)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: safeErrorMessage(updateError, "Failed to update workflow status") },
      { status: 500 }
    );
  }

  if (!updatedWorkflowRow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const workflow = normalizeWorkflowDefinitionRow(
    updatedWorkflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );

  const action = parsedRequest.data.archived ? "workflow.archive" : "workflow.unarchive";
  auditLog({
    action,
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflow.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      reason: parsedRequest.data.reason ?? null,
      next_status: workflow.status,
      published_version: workflow.published_version,
    },
  });

  return NextResponse.json({
    workflow,
    message: parsedRequest.data.archived
      ? "Workflow archived."
      : "Workflow restored from archive.",
  });
}
