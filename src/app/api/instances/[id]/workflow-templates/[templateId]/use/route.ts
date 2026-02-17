import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  useWorkflowTemplateRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  buildWorkflowDraftFromTemplate,
  resolveWorkflowTemplateForUse,
} from "@/lib/workflows/templates";
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
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;
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

  const parsedRequest = useWorkflowTemplateRequestSchema.safeParse(body);
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

  let template;
  try {
    template = await resolveWorkflowTemplateForUse(
      admin,
      id,
      instance.customer_id,
      templateId
    );
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow template") },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json({ error: "Workflow template not found" }, { status: 404 });
  }

  const draft = buildWorkflowDraftFromTemplate({
    template,
    name: parsedRequest.data.name,
    description: parsedRequest.data.description,
  });
  const nextTags = parsedRequest.data.tags ?? [];
  const nextOwnerId = parsedRequest.data.owner_id ?? user.id;
  const validationResult = validateWorkflowGraph(draft.graph);

  if (!validationResult.valid) {
    return NextResponse.json(
      {
        error: "Template graph is invalid.",
        validation_errors: validationResult.errors,
      },
      { status: 409 }
    );
  }

  const { data: createdWorkflow, error: createError } = await admin.rpc(
    "create_workflow_definition_with_snapshot",
    {
      p_instance_id: id,
      p_customer_id: instance.customer_id,
      p_name: draft.name,
      p_description: draft.description,
      p_graph: draft.graph,
      p_created_by: user.id,
      p_is_valid: validationResult.valid,
      p_validation_errors: validationResult.errors,
      p_tags: nextTags,
      p_owner_id: nextOwnerId,
    }
  );

  if (createError) {
    if (createError.code === "23505") {
      return NextResponse.json(
        { error: "A workflow with this name already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(createError, "Failed to create workflow") },
      { status: 500 }
    );
  }

  const workflowRow = Array.isArray(createdWorkflow)
    ? createdWorkflow[0]
    : createdWorkflow;
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
    action: "workflow.template.use",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflow.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      template_id: template.id,
      template_name: template.name,
      template_kind: template.template_kind,
      template_version: template.latest_version,
      draft_version: workflow.draft_version,
      template_metadata: draft.metadata,
      tags_count: workflow.tags.length,
      owner_id: workflow.owner_id,
    },
  });

  return NextResponse.json(
    {
      workflow,
      template: {
        id: template.id,
        name: template.name,
        template_kind: template.template_kind,
      },
    },
    { status: 201 }
  );
}
