import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
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
  {
    params,
  }: {
    params: Promise<{ id: string; runId: string; artifactId: string }>;
  }
) {
  const { id, runId, artifactId } = await params;
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

  const { data: artifact, error: artifactError } = await admin
    .from("workflow_run_artifacts")
    .select("id, run_id, workflow_id, artifact_type, name, storage_bucket, storage_path")
    .eq("id", artifactId)
    .eq("run_id", runId)
    .eq("instance_id", id)
    .eq("customer_id", instance.customer_id)
    .maybeSingle();

  if (artifactError) {
    return NextResponse.json(
      { error: safeErrorMessage(artifactError, "Failed to load workflow artifact") },
      { status: 500 }
    );
  }

  if (!artifact) {
    return NextResponse.json({ error: "Workflow artifact not found" }, { status: 404 });
  }

  if (!artifact.storage_bucket || !artifact.storage_path) {
    return NextResponse.json(
      { error: "Artifact has no downloadable storage object." },
      { status: 409 }
    );
  }

  const { data: signedUrlData, error: signedUrlError } = await admin.storage
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
    actor: user.email || user.id,
    resource_type: "workflow_run_artifact",
    resource_id: artifact.id,
    details: {
      customer_id: instance.customer_id,
      instance_id: id,
      run_id: runId,
      workflow_id: artifact.workflow_id,
      artifact_type: artifact.artifact_type,
      storage_bucket: artifact.storage_bucket,
    },
  });

  return NextResponse.redirect(signedUrlData.signedUrl, { status: 302 });
}
