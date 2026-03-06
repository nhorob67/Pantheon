import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  importWorkflowRequestSchema,
  validateWorkflowGraph,
} from "@/lib/validators/workflow";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { resolveImportedWorkflowDraft } from "@/lib/workflows/import-export";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({ tenantId: z.uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to import workflow",
    },
    async (state) => {
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

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsedRequest = importWorkflowRequestSchema.safeParse(body);
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

      let importedDraft;
      try {
        importedDraft = resolveImportedWorkflowDraft({
          document: parsedRequest.data.document,
          name: parsedRequest.data.name,
          description: parsedRequest.data.description,
          tags: parsedRequest.data.tags,
          owner_id: parsedRequest.data.owner_id,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              error,
              "Invalid workflow import document"
            ),
          },
          { status: 400 }
        );
      }

      const validationResult = validateWorkflowGraph(importedDraft.graph);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: "Imported workflow graph is invalid.",
            code: "WORKFLOW_IMPORT_INVALID",
            errors: validationResult.errors,
          },
          { status: 409 }
        );
      }

      const effectiveOwnerId =
        importedDraft.owner_id === undefined
          ? state.user.id
          : importedDraft.owner_id === null
            ? null
            : importedDraft.owner_id === state.user.id
              ? importedDraft.owner_id
              : state.user.id;

      const { data: createdWorkflow, error: createError } =
        await state.admin.rpc(
          "create_workflow_definition_with_snapshot",
          {
            p_instance_id: instanceId,
            p_customer_id: state.tenantContext.customerId,
            p_name: importedDraft.name,
            p_description: importedDraft.description,
            p_graph: importedDraft.graph,
            p_created_by: state.user.id,
            p_is_valid: validationResult.valid,
            p_validation_errors: validationResult.errors,
            p_tags: importedDraft.tags,
            p_owner_id: effectiveOwnerId,
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
          {
            error: safeErrorMessage(
              createError,
              "Failed to import workflow"
            ),
          },
          { status: 500 }
        );
      }

      const workflowRow = Array.isArray(createdWorkflow)
        ? createdWorkflow[0]
        : createdWorkflow;
      if (!workflowRow) {
        return NextResponse.json(
          {
            error:
              "Workflow was imported, but response payload was empty.",
          },
          { status: 500 }
        );
      }

      const workflow = normalizeWorkflowDefinitionRow(
        workflowRow as Parameters<
          typeof normalizeWorkflowDefinitionRow
        >[0]
      );

      auditLog({
        action: "workflow.import",
        actor: state.user.email || state.user.id,
        resource_type: "workflow",
        resource_id: workflow.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          imported_source_workflow_id:
            parsedRequest.data.document.source.workflow_id || null,
          imported_source_instance_id:
            parsedRequest.data.document.source.instance_id || null,
          tags_count: workflow.tags.length,
          owner_id: workflow.owner_id,
          schema_version: parsedRequest.data.document.schema_version,
        },
      });

      return NextResponse.json({ workflow }, { status: 201 });
    }
  );
}
