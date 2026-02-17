import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { validateWorkflowGraph } from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { ensurePublishedWorkflowRuntimeFreshness } from "@/lib/workflows/publish-runtime-freshness";
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
    .select("id, name, status, draft_graph, draft_version, published_version")
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

  const validationResult = validateWorkflowGraph(workflow.draft_graph);

  if (!validationResult.valid) {
    const { error: invalidateError } = await admin
      .from("workflow_definitions")
      .update({
        is_valid: false,
        last_validation_errors: validationResult.errors,
        last_validated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", workflowId)
      .eq("instance_id", id);

    if (invalidateError) {
      return NextResponse.json(
        { error: "Failed to persist validation result" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Workflow is invalid and cannot be published.",
        code: "WORKFLOW_INVALID",
        errors: validationResult.errors,
      },
      { status: 409 }
    );
  }

  const { data: published, error: publishError } = await admin
    .from("workflow_definitions")
    .update({
      status: "published",
      published_version: workflow.draft_version,
      is_valid: true,
      last_validation_errors: [],
      last_validated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", workflowId)
    .eq("instance_id", id)
    .select("id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at")
    .single();

  if (publishError || !published) {
    return NextResponse.json(
      { error: safeErrorMessage(publishError, "Failed to publish workflow") },
      { status: 500 }
    );
  }

  const normalizedWorkflow = normalizeWorkflowDefinitionRow(
    published as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
  );

  const freshnessResult = await ensurePublishedWorkflowRuntimeFreshness({
    deploy: () => rebuildAndDeploy(id),
    rollbackPublishedState: async () => {
      const { error: rollbackError } = await admin
        .from("workflow_definitions")
        .update({
          status: workflow.status,
          published_version: workflow.published_version,
          updated_by: user.id,
        })
        .eq("id", workflowId)
        .eq("instance_id", id)
        .eq("status", "published")
        .eq("published_version", workflow.draft_version);

      if (rollbackError) {
        return {
          success: false as const,
          error: rollbackError,
        };
      }

      return {
        success: true as const,
      };
    },
    formatError: safeErrorMessage,
  });

  if (!freshnessResult.ok) {
    if (freshnessResult.code === "WORKFLOW_DEPLOY_FAILED_ROLLBACK_FAILED") {
      auditLog({
        action: "workflow.publish.deploy_failed_rollback_failed",
        actor: user.email || user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: instance.customer_id,
          instance_id: id,
          draft_version: workflow.draft_version,
          previous_status: workflow.status,
          previous_published_version: workflow.published_version,
          rollback_error:
            freshnessResult.rollback_error_message || "Rollback failed",
        },
      });
    } else {
      auditLog({
        action: "workflow.publish.deploy_failed_rolled_back",
        actor: user.email || user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: instance.customer_id,
          instance_id: id,
          draft_version: workflow.draft_version,
          previous_status: workflow.status,
          previous_published_version: workflow.published_version,
        },
      });
    }

    return NextResponse.json(
      {
        error: freshnessResult.error,
        code: freshnessResult.code,
      },
      { status: freshnessResult.status }
    );
  }

  auditLog({
    action: "workflow.publish",
    actor: user.email || user.id,
    resource_type: "workflow",
    resource_id: workflowId,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      workflow_name: normalizedWorkflow.name,
      published_version: normalizedWorkflow.published_version,
      draft_version: normalizedWorkflow.draft_version,
      tags_count: normalizedWorkflow.tags.length,
      owner_id: normalizedWorkflow.owner_id,
    },
  });

  return NextResponse.json({
    workflow: normalizedWorkflow,
    published: true,
  });
}
