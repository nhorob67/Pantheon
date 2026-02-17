import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  updateWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import {
  getInstanceWorkflowDetail,
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
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id, workflowId } = await params;
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
    const detail = await getInstanceWorkflowDetail(
      admin,
      id,
      authResult.instance.customer_id,
      workflowId
    );

    if (!detail) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow") },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  const { id, workflowId } = await params;
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

  const parsed = updateWorkflowRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
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
    .select("id, name, description, draft_graph, tags, owner_id")
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

  const nextName = parsed.data.name ?? existingWorkflow.name;
  const nextDescription =
    parsed.data.description === undefined
      ? existingWorkflow.description
      : parsed.data.description;
  const nextGraph = parsed.data.graph ?? existingWorkflow.draft_graph;
  const nextTags =
    parsed.data.tags === undefined
      ? Array.isArray(existingWorkflow.tags)
        ? existingWorkflow.tags
        : []
      : parsed.data.tags;
  const nextOwnerId =
    parsed.data.owner_id === undefined
      ? existingWorkflow.owner_id
      : parsed.data.owner_id;
  const validationResult = validateWorkflowGraph(nextGraph);

  const { data, error } = await admin.rpc(
    "update_workflow_definition_draft_with_snapshot",
    {
      p_workflow_id: workflowId,
      p_instance_id: id,
      p_customer_id: instance.customer_id,
      p_name: nextName,
      p_description: nextDescription,
      p_graph: nextGraph,
      p_expected_draft_version: parsed.data.expected_draft_version,
      p_updated_by: user.id,
      p_is_valid: validationResult.valid,
      p_validation_errors: validationResult.errors,
      p_tags: nextTags,
      p_owner_id: nextOwnerId,
    }
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A workflow with this name already exists." },
        { status: 409 }
      );
    }

    if (error.code === "40001") {
      const { data: latest } = await admin
        .from("workflow_definitions")
        .select("draft_version")
        .eq("id", workflowId)
        .maybeSingle();

      return NextResponse.json(
        {
          error: "Workflow version conflict. Refresh and retry.",
          code: "WORKFLOW_VERSION_CONFLICT",
          current_draft_version: latest?.draft_version ?? null,
        },
        { status: 409 }
      );
    }

    if (error.code === "P0002") {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update workflow") },
      { status: 500 }
    );
  }

  const workflowRow = Array.isArray(data) ? data[0] : data;
  if (!workflowRow) {
    return NextResponse.json(
      { error: "Workflow was updated, but response payload was empty." },
      { status: 500 }
    );
  }

  const workflow = normalizeWorkflowDefinitionRow(
    workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );

  auditLog({
    action: "workflow.update",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflow.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      draft_version: workflow.draft_version,
      expected_draft_version: parsed.data.expected_draft_version,
      is_valid: workflow.is_valid,
      tags_count: workflow.tags.length,
      owner_id: workflow.owner_id,
    },
  });

  return NextResponse.json({
    workflow,
  });
}
