import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { getWorkflowRun, normalizeWorkflowRunRow } from "@/lib/queries/workflow-runs";
import { workflowRunCancelRequestSchema } from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const RUN_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, trigger_type, status, source_version, retry_of_run_id, requested_by, runtime_correlation_id, input_payload, output_payload, error_message, metadata, started_at, completed_at, canceled_at, created_at, updated_at";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  runId: z.uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; runId: string }> }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant or run ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "writes",
      fallbackErrorMessage: "Failed to cancel workflow run",
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

      const parsedRequest = workflowRunCancelRequestSchema.safeParse(body);
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

      const run = await getWorkflowRun(
        state.admin,
        instanceId,
        state.tenantContext.customerId,
        parsed.data.runId
      );

      if (!run) {
        return NextResponse.json(
          { error: "Workflow run not found" },
          { status: 404 }
        );
      }

      if (
        run.status === "succeeded" ||
        run.status === "failed" ||
        run.status === "approval_rejected" ||
        run.status === "canceled"
      ) {
        return NextResponse.json(
          { error: "Run is already finished and cannot be canceled." },
          { status: 409 }
        );
      }

      const nowIso = new Date().toISOString();
      const metadata = {
        ...run.metadata,
        cancel_requested_by: state.user.id,
        cancel_requested_at: nowIso,
        cancel_reason:
          parsedRequest.data.reason && parsedRequest.data.reason.length > 0
            ? parsedRequest.data.reason
            : run.metadata.cancel_reason ?? null,
      };

      const updates: Record<string, unknown> = {
        metadata,
      };

      let action = "workflow.run.cancel_requested";

      if (run.status === "queued" || run.status === "awaiting_approval") {
        updates.status = "canceled";
        updates.canceled_at = nowIso;
        updates.completed_at = nowIso;
        action = "workflow.run.canceled";
      } else if (
        run.status === "running" ||
        run.status === "paused_waiting_approval"
      ) {
        updates.status = "cancel_requested";
      } else if (run.status === "cancel_requested") {
        updates.status = "cancel_requested";
      }

      const { data: updatedRunRow, error: updateError } = await state.admin
        .from("workflow_runs")
        .update(updates)
        .eq("id", parsed.data.runId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .select(RUN_SELECT_COLUMNS)
        .single();

      if (updateError || !updatedRunRow) {
        return NextResponse.json(
          { error: safeErrorMessage(updateError, "Failed to cancel workflow run") },
          { status: 500 }
        );
      }

      const updatedRun = normalizeWorkflowRunRow(
        updatedRunRow as Parameters<typeof normalizeWorkflowRunRow>[0]
      );

      auditLog({
        action,
        actor: state.user.email || state.user.id,
        resource_type: "workflow_run",
        resource_id: updatedRun.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          workflow_id: updatedRun.workflow_id,
          status: updatedRun.status,
          reason: parsedRequest.data.reason || null,
        },
      });

      return NextResponse.json({ run: updatedRun });
    }
  );
}
