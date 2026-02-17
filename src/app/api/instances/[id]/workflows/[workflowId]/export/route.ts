import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { buildWorkflowExportDocument } from "@/lib/workflows/import-export";
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

export async function GET(
  _request: Request,
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

  const { data: workflowRow, error: workflowError } = await admin
    .from("workflow_definitions")
    .select(
      "id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at"
    )
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

  if (!workflowRow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const workflow = normalizeWorkflowDefinitionRow(
    workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );
  const document = buildWorkflowExportDocument(workflow);

  auditLog({
    action: "workflow.export",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflowId,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      draft_version: workflow.draft_version,
      tags_count: workflow.tags.length,
      owner_id: workflow.owner_id,
    },
  });

  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${workflow.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "workflow"}-export.json"`,
    },
  });
}
