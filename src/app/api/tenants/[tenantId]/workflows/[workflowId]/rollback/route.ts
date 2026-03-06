import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import {
  validateWorkflowGraph,
  workflowRollbackRequestSchema,
} from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const WORKFLOW_SELECT_COLUMNS =
  "id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at";

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
      fallbackErrorMessage: "Failed to rollback workflow",
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

      let body: unknown = {};
      try {
        const rawBody = await request.text();
        if (rawBody.trim().length > 0) {
          body = JSON.parse(rawBody);
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = workflowRollbackRequestSchema.safeParse(body);
      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Invalid data", details: parsedRequest.error.flatten() },
          { status: 400 }
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
        .select("id, name, status, published_version")
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

      if (workflow.status !== "published" || !workflow.published_version) {
        return NextResponse.json(
          { error: "Only published workflows can be rolled back." },
          { status: 409 }
        );
      }

      const currentPublishedVersion = workflow.published_version;
      const requestedTargetVersion = parsedRequest.data.target_version ?? null;

      if (
        requestedTargetVersion !== null &&
        requestedTargetVersion >= currentPublishedVersion
      ) {
        return NextResponse.json(
          {
            error:
              "Rollback target must be older than the currently published version.",
          },
          { status: 409 }
        );
      }

      let targetVersion: number | null = null;
      let targetGraph: unknown = null;

      if (requestedTargetVersion !== null) {
        const { data: requestedVersionRow, error: requestedVersionError } =
          await state.admin
            .from("workflow_versions")
            .select("version, graph")
            .eq("workflow_id", workflowId)
            .eq("instance_id", instanceId)
            .eq("customer_id", state.tenantContext.customerId)
            .eq("version", requestedTargetVersion)
            .maybeSingle();

        if (requestedVersionError) {
          return NextResponse.json(
            {
              error: safeErrorMessage(
                requestedVersionError,
                "Failed to load rollback target version"
              ),
            },
            { status: 500 }
          );
        }

        if (!requestedVersionRow) {
          return NextResponse.json(
            { error: "Requested rollback target version was not found." },
            { status: 404 }
          );
        }

        targetVersion = Number(requestedVersionRow.version);
        targetGraph = requestedVersionRow.graph;
      } else {
        const { data: previousVersionRow, error: previousVersionError } =
          await state.admin
            .from("workflow_versions")
            .select("version, graph")
            .eq("workflow_id", workflowId)
            .eq("instance_id", instanceId)
            .eq("customer_id", state.tenantContext.customerId)
            .lt("version", currentPublishedVersion)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (previousVersionError) {
          return NextResponse.json(
            {
              error: safeErrorMessage(
                previousVersionError,
                "Failed to discover rollback target version"
              ),
            },
            { status: 500 }
          );
        }

        if (!previousVersionRow) {
          return NextResponse.json(
            { error: "No rollback target version is available for this workflow." },
            { status: 409 }
          );
        }

        targetVersion = Number(previousVersionRow.version);
        targetGraph = previousVersionRow.graph;
      }

      const validationResult = validateWorkflowGraph(targetGraph);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error:
              "Rollback target failed workflow validation. Select a different version.",
            code: "WORKFLOW_ROLLBACK_TARGET_INVALID",
            errors: validationResult.errors,
          },
          { status: 409 }
        );
      }

      const { data: rollbackWorkflowRow, error: rollbackUpdateError } =
        await state.admin
          .from("workflow_definitions")
          .update({
            status: "published",
            published_version: targetVersion,
            is_valid: true,
            last_validation_errors: [],
            last_validated_at: new Date().toISOString(),
            updated_by: state.user.id,
          })
          .eq("id", workflowId)
          .eq("instance_id", instanceId)
          .eq("customer_id", state.tenantContext.customerId)
          .eq("published_version", currentPublishedVersion)
          .select(WORKFLOW_SELECT_COLUMNS)
          .maybeSingle();

      if (rollbackUpdateError) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              rollbackUpdateError,
              "Failed to update published workflow version"
            ),
          },
          { status: 500 }
        );
      }

      if (!rollbackWorkflowRow) {
        return NextResponse.json(
          {
            error:
              "Workflow publish state changed during rollback. Refresh and retry.",
          },
          { status: 409 }
        );
      }

      const rollbackWorkflow = normalizeWorkflowDefinitionRow(
        rollbackWorkflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
      );

      auditLog({
        action: "workflow.rollback",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflowId,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          tenant_id: tenantId,
          workflow_name: workflow.name,
          previous_published_version: currentPublishedVersion,
          target_published_version: targetVersion,
          reason: parsedRequest.data.reason || null,
          tags_count: rollbackWorkflow.tags.length,
          owner_id: rollbackWorkflow.owner_id,
        },
      });

      return NextResponse.json({
        workflow: rollbackWorkflow,
        rolled_back: true,
        from_version: currentPublishedVersion,
        to_version: targetVersion,
      });
    }
  );
}
