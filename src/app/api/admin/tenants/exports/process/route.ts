import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { auditLog } from "@/lib/security/audit";
import {
  claimTenantExportJobs,
  processTenantExportJob,
} from "@/lib/runtime/tenant-exports";

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const DEFAULT_LEASE_SECONDS = 120;

function clampBatch(value: string | null): number {
  if (!value) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(parsed)));
}

async function isAuthorized(request: Request): Promise<boolean> {
  const expectedTokens = [
    process.env.TENANT_EXPORT_PROCESSOR_TOKEN,
    process.env.TENANT_RUNTIME_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-tenant-export-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!(user && isAdmin(user.email));
}

export async function POST(request: Request) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    auditLog({
      action: "tenant.export.processor.denied",
      actor: "anonymous",
      resource_type: "tenant_export_job",
      resource_id: "process",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const batch = clampBatch(url.searchParams.get("batch"));
  const workerId = url.searchParams.get("worker_id") || "tenant-export-worker";

  const admin = createAdminClient();
  const claims = await claimTenantExportJobs(admin, {
    workerId,
    limit: batch,
    leaseSeconds: DEFAULT_LEASE_SECONDS,
  });

  if (claims.length === 0) {
    auditLog({
      action: "tenant.export.processor.empty",
      actor: workerId,
      resource_type: "tenant_export_job",
      resource_id: "none",
      details: {
        worker_id: workerId,
      },
    });
    return NextResponse.json({
      claimed: 0,
      completed: 0,
      failed: 0,
      worker: workerId,
    });
  }

  let completed = 0;
  let failed = 0;

  for (const claim of claims) {
    const result = await processTenantExportJob(admin, claim, workerId);
    if (result.status === "completed") {
      completed += 1;
    } else {
      failed += 1;
    }
  }
  auditLog({
    action: "tenant.export.processor.completed",
    actor: workerId,
    resource_type: "tenant_export_job",
    resource_id: "batch",
    details: {
      claimed: claims.length,
      completed,
      failed,
      worker_id: workerId,
    },
  });

  return NextResponse.json({
    claimed: claims.length,
    completed,
    failed,
    worker: workerId,
  });
}
