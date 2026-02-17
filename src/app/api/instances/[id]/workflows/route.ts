import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  createWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { EMPTY_WORKFLOW_GRAPH } from "@/types/workflow";
import {
  listInstanceWorkflows,
  normalizeWorkflowDefinitionRow,
} from "@/lib/queries/workflows";
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

async function getAuthorizedInstance(instanceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", instanceId)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return { error: "Not found", status: 404 } as const;
  }

  return { user, instance } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthorizedInstance(id);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    authResult.instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    const workflows = await listInstanceWorkflows(
      admin,
      id,
      authResult.instance.customer_id
    );
    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflows") },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await getAuthorizedInstance(id);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user, instance } = authResult;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createWorkflowRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const graph = parsed.data.graph ?? EMPTY_WORKFLOW_GRAPH;
  const validationResult = validateWorkflowGraph(graph);

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

  const { data, error } = await admin.rpc(
    "create_workflow_definition_with_snapshot",
    {
      p_instance_id: id,
      p_customer_id: instance.customer_id,
      p_name: parsed.data.name,
      p_description: parsed.data.description ?? null,
      p_graph: graph,
      p_created_by: user.id,
      p_is_valid: validationResult.valid,
      p_validation_errors: validationResult.errors,
      p_tags: parsed.data.tags ?? [],
      p_owner_id: parsed.data.owner_id ?? user.id,
    }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A workflow with this name already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create workflow") },
      { status: 500 }
    );
  }

  const workflowRow = Array.isArray(data) ? data[0] : data;
  if (!workflowRow) {
    return NextResponse.json(
      { error: "Workflow was created, but response payload was empty." },
      { status: 500 }
    );
  }

  const workflow = normalizeWorkflowDefinitionRow(
    workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );

  auditLog({
    action: "workflow.create",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflow.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      draft_version: workflow.draft_version,
      is_valid: workflow.is_valid,
      tags_count: workflow.tags.length,
      owner_id: workflow.owner_id,
    },
  });

  return NextResponse.json(
    {
      workflow,
    },
    { status: 201 }
  );
}
