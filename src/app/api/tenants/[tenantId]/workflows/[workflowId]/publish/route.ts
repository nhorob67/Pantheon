import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { validateWorkflowGraph } from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { ensurePublishedWorkflowRuntimeFreshness } from "@/lib/workflows/publish-runtime-freshness";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  workflowId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; workflowId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or workflow ID",
  });
  if (parsed instanceof Response) return parsed;

  const { tenantId, workflowId } = parsed.data;

  return runTenantRoute(
    request,
    {
      tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to publish workflow",
    },
    async (state) => {
      const rateLimit = await consumeConfigUpdateRateLimit(state.user.id);
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

      const mapping = await resolveCanonicalLegacyInstanceForTenant(
        state.admin,
        state.tenantContext.tenantId
      );
      const instanceId = mapping.instanceId;

      if (!instanceId) {
        return NextResponse.json(
          { error: "No instance mapping found" },
          { status: 404 }
        );
      }

      const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
        state.admin,
        state.tenantContext.customerId
      );

      if (!workflowBuilderEnabled) {
        return NextResponse.json(
          { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      const { data: workflow, error: workflowError } = await state.admin
        .from("workflow_definitions")
        .select("id, name, status, draft_graph, draft_version, published_version")
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (workflowError) {
        return NextResponse.json(
          { error: safeErrorMessage(workflowError, "Failed to load workflow") },
          { status: 500 }
        );
      }

      if (!workflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      const validationResult = validateWorkflowGraph(workflow.draft_graph);

      if (!validationResult.valid) {
        const { error: invalidateError } = await state.admin
          .from("workflow_definitions")
          .update({
            is_valid: false,
            last_validation_errors: validationResult.errors,
            last_validated_at: new Date().toISOString(),
            updated_by: state.user.id,
          })
          .eq("id", workflowId)
          .eq("instance_id", instanceId);

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

      const { data: published, error: publishError } = await state.admin
        .from("workflow_definitions")
        .update({
          status: "published",
          published_version: workflow.draft_version,
          is_valid: true,
          last_validation_errors: [],
          last_validated_at: new Date().toISOString(),
          updated_by: state.user.id,
        })
        .eq("id", workflowId)
        .eq("instance_id", instanceId)
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
        deploy: () => Promise.resolve(),
        rollbackPublishedState: async () => {
          const { error: rollbackError } = await state.admin
            .from("workflow_definitions")
            .update({
              status: workflow.status,
              published_version: workflow.published_version,
              updated_by: state.user.id,
            })
            .eq("id", workflowId)
            .eq("instance_id", instanceId)
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
            actor: state.user.email || state.user.id,
            resource_type: "workflow",
            resource_id: workflowId,
            details: {
              customer_id: state.tenantContext.customerId,
              instance_id: instanceId,
              tenant_id: tenantId,
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
            actor: state.user.email || state.user.id,
            resource_type: "workflow",
            resource_id: workflowId,
            details: {
              customer_id: state.tenantContext.customerId,
              instance_id: instanceId,
              tenant_id: tenantId,
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
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
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
  );
}
