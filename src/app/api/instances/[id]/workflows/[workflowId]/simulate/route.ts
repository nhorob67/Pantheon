import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLog } from "@/lib/security/audit";
import {
  workflowSimulationRequestSchema,
} from "@/lib/validators/workflow";
import { simulateWorkflowGraph } from "@/lib/workflows/simulation";
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

  let body: unknown = {};
  try {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      body = JSON.parse(rawBody);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedRequest = workflowSimulationRequestSchema.safeParse(body);
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

  const { data: workflow } = await admin
    .from("workflow_definitions")
    .select("id, name, draft_graph")
    .eq("id", workflowId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .maybeSingle();

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const graph = parsedRequest.data.graph ?? workflow.draft_graph;
  const simulation = simulateWorkflowGraph({
    graph,
    branchDecisions: parsedRequest.data.branch_decisions,
    maxSteps: parsedRequest.data.max_steps,
    stopAtApproval: parsedRequest.data.stop_at_approval,
  });

  auditLog({
    action: "workflow.simulate",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflowId,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      workflow_name: workflow.name,
      stop_reason: simulation.stop_reason,
      step_count: simulation.steps.length,
      completed: simulation.completed,
      warning_count: simulation.warnings.length,
      safe_mode: true,
    },
  });

  return NextResponse.json(simulation);
}
