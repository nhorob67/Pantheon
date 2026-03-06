import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { parseTenantRouteParams, runTenantRoute } from "@/lib/runtime/tenant-route";
import { resolveCanonicalLegacyInstanceForTenant } from "@/lib/runtime/tenant-agents";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

const paramsSchema = z.object({
  tenantId: z.uuid(),
  runId: z.uuid(),
  artifactId: z.uuid(),
});

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ tenantId: string; runId: string; artifactId: string }>;
  }
) {
  const parsed = await parseTenantRouteParams({
    request,
    params,
    schema: paramsSchema,
    errorMessage: "Invalid tenant, run, or artifact ID",
  });
  if (parsed instanceof Response) return parsed;

  return runTenantRoute(
    request,
    {
      tenantId: parsed.data.tenantId,
      requestTraceId: parsed.requestTraceId,
      requiredGate: "reads",
      fallbackErrorMessage: "Failed to download workflow artifact",
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

      const { data: artifact, error: artifactError } = await state.admin
        .from("workflow_run_artifacts")
        .select(
          "id, run_id, workflow_id, artifact_type, name, storage_bucket, storage_path"
        )
        .eq("id", parsed.data.artifactId)
        .eq("run_id", parsed.data.runId)
        .eq("instance_id", instanceId)
        .eq("customer_id", state.tenantContext.customerId)
        .maybeSingle();

      if (artifactError) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              artifactError,
              "Failed to load workflow artifact"
            ),
          },
          { status: 500 }
        );
      }

      if (!artifact) {
        return NextResponse.json(
          { error: "Workflow artifact not found" },
          { status: 404 }
        );
      }

      if (!artifact.storage_bucket || !artifact.storage_path) {
        return NextResponse.json(
          { error: "Artifact has no downloadable storage object." },
          { status: 409 }
        );
      }

      const { data: signedUrlData, error: signedUrlError } =
        await state.admin.storage
          .from(artifact.storage_bucket)
          .createSignedUrl(artifact.storage_path, 120, {
            download: artifact.name,
          });

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return NextResponse.json(
          {
            error: safeErrorMessage(
              signedUrlError,
              "Failed to create artifact download URL"
            ),
          },
          { status: 500 }
        );
      }

      auditLog({
        action: "workflow.run.artifact.download_requested",
        actor: state.user.email || state.user.id,
        resource_type: "workflow_run_artifact",
        resource_id: artifact.id,
        details: {
          customer_id: state.tenantContext.customerId,
          instance_id: instanceId,
          run_id: parsed.data.runId,
          workflow_id: artifact.workflow_id,
          artifact_type: artifact.artifact_type,
          storage_bucket: artifact.storage_bucket,
        },
      });

      return NextResponse.redirect(signedUrlData.signedUrl, { status: 302 });
    }
  );
}
