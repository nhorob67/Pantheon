import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLog } from "@/lib/security/audit";
import {
  workflowValidateRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

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

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const { data: workflow } = await admin
    .from("workflow_definitions")
    .select("id, draft_graph")
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .maybeSingle();

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
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

  const parsedRequest = workflowValidateRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }

  const graph = parsedRequest.data.graph ?? workflow.draft_graph;
  const result = validateWorkflowGraph(graph);

  const { error: updateError } = await admin
    .from("workflow_definitions")
    .update({
      is_valid: result.valid,
      last_validation_errors: result.errors,
      last_validated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", workflowId)
    .eq("instance_id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to persist validation result" },
      { status: 500 }
    );
  }

  auditLog({
    action: "workflow.validate",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflowId,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      valid: result.valid,
      error_count: result.errors.length,
    },
  });

  return NextResponse.json({
    workflow_id: workflowId,
    valid: result.valid,
    error_count: result.errors.length,
    errors: result.errors,
  });
}
