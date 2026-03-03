import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  summarizeAgentSkillReferences,
  summarizeCustomSkillsMetadata,
  type TenantExportSkillsMetadata,
} from "@/lib/runtime/tenant-export-metadata";

export type TenantExportScope = "full" | "knowledge_only" | "metadata_only";
export type TenantExportFormat = "jsonl" | "csv";

export interface TenantExportRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  requested_by: string | null;
  export_scope: TenantExportScope;
  format: TenantExportFormat;
  status: "queued" | "running" | "completed" | "failed" | "expired" | "canceled";
  include_blobs: boolean;
  manifest_path: string | null;
  file_count: number;
  total_size_bytes: number;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantExportJobRecord {
  id: string;
  export_id: string;
  tenant_id: string;
  customer_id: string;
  job_kind: "export" | "cleanup";
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  attempt: number;
  worker_id: string | null;
  lock_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TenantExportFileInsert {
  file_name: string;
  file_type: string;
  storage_bucket: string;
  storage_path: string;
  checksum_sha256: string;
  size_bytes: number;
}

interface TenantExportBundleResult {
  manifestPath: string;
  files: TenantExportFileInsert[];
  totalSizeBytes: number;
}

interface TenantExportBillingMetadataPointer {
  customer_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan: string | null;
}

const TENANT_EXPORT_STORAGE_BUCKET =
  process.env.TENANT_EXPORT_STORAGE_BUCKET || "tenant-exports";
const EXPORT_DOWNLOAD_TTL_SECONDS = 60 * 60 * 24;
const EXPORT_EXPIRY_DAYS = 7;

const EXPORT_SCOPE_TABLES: Record<TenantExportScope, string[]> = {
  metadata_only: [
    "tenants",
    "tenant_members",
    "tenant_integrations",
    "tenant_agents",
    "tenant_tools",
    "tenant_tool_policies",
  ],
  knowledge_only: ["tenant_knowledge_items", "tenant_memory_records"],
  full: [
    "tenants",
    "tenant_members",
    "tenant_integrations",
    "tenant_agents",
    "tenant_sessions",
    "tenant_messages",
    "tenant_runtime_runs",
    "tenant_tools",
    "tenant_tool_policies",
    "tenant_tool_invocations",
    "tenant_approvals",
    "tenant_knowledge_items",
    "tenant_memory_records",
    "instance_tenant_mappings",
  ],
};

function sha256Hex(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function ensureExportBucket(admin: SupabaseClient): Promise<void> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(safeErrorMessage(listError, "Failed to list storage buckets"));
  }

  const exists = Array.isArray(buckets)
    && buckets.some((bucket) => bucket.name === TENANT_EXPORT_STORAGE_BUCKET);
  if (exists) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(
    TENANT_EXPORT_STORAGE_BUCKET,
    {
      public: false,
      fileSizeLimit: "50mb",
    }
  );

  if (createError && createError.message !== "The resource already exists") {
    throw new Error(
      safeErrorMessage(createError, "Failed to create tenant export storage bucket")
    );
  }
}

async function fetchTenantScopedRows(
  admin: SupabaseClient,
  table: string,
  tenantId: string
): Promise<Record<string, unknown>[]> {
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(50000);

  if (error) {
    throw new Error(
      safeErrorMessage(error, `Failed to load export rows for table ${table}`)
    );
  }

  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

async function fetchBillingMetadataPointer(
  admin: SupabaseClient,
  customerId: string
): Promise<TenantExportBillingMetadataPointer> {
  const { data, error } = await admin
    .from("customers")
    .select("id, stripe_customer_id, stripe_subscription_id, subscription_status, plan")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve customer billing metadata for export"));
  }

  if (!data) {
    return {
      customer_id: customerId,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
      plan: null,
    };
  }

  return {
    customer_id: String((data as { id?: unknown }).id || customerId),
    stripe_customer_id:
      typeof (data as { stripe_customer_id?: unknown }).stripe_customer_id === "string"
        ? (data as { stripe_customer_id: string }).stripe_customer_id
        : null,
    stripe_subscription_id:
      typeof (data as { stripe_subscription_id?: unknown }).stripe_subscription_id === "string"
        ? (data as { stripe_subscription_id: string }).stripe_subscription_id
        : null,
    subscription_status:
      typeof (data as { subscription_status?: unknown }).subscription_status === "string"
        ? (data as { subscription_status: string }).subscription_status
        : null,
    plan:
      typeof (data as { plan?: unknown }).plan === "string"
        ? (data as { plan: string }).plan
        : null,
  };
}

async function fetchSkillsMetadata(
  admin: SupabaseClient,
  exportRow: TenantExportRecord,
  tenantAgentRows: Record<string, unknown>[]
): Promise<TenantExportSkillsMetadata> {
  const { data, error } = await admin
    .from("custom_skills")
    .select("slug, status")
    .eq("customer_id", exportRow.customer_id);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve custom skills metadata for export"));
  }

  const customSkillRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];

  return {
    customer_id: exportRow.customer_id,
    custom_skills: summarizeCustomSkillsMetadata(customSkillRows),
    agent_skill_references: summarizeAgentSkillReferences(tenantAgentRows),
  };
}

async function buildTenantExportBundle(
  admin: SupabaseClient,
  exportRow: TenantExportRecord
): Promise<TenantExportBundleResult> {
  await ensureExportBucket(admin);

  const tables = EXPORT_SCOPE_TABLES[exportRow.export_scope];
  const dataFileName = exportRow.format === "csv" ? "tenant-export.csv" : "tenant-export.jsonl";
  const prefix = `${exportRow.tenant_id}/${exportRow.id}`;
  const dataPath = `${prefix}/${dataFileName}`;
  const manifestPath = `${prefix}/manifest.json`;

  const allRows: Array<Record<string, unknown>> = [];
  const tableCounts: Record<string, number> = {};
  let tenantAgentRows: Record<string, unknown>[] = [];

  for (const table of tables) {
    const rows = await fetchTenantScopedRows(admin, table, exportRow.tenant_id);
    tableCounts[table] = rows.length;
    if (table === "tenant_agents") {
      tenantAgentRows = rows;
    }
    for (const row of rows) {
      allRows.push({
        table,
        record: row,
      });
    }
  }

  const dataContent =
    exportRow.format === "csv"
      ? ["table,record_json", ...allRows.map((row) => `${row.table},${JSON.stringify(row.record)}`)].join("\n")
      : allRows.map((row) => JSON.stringify(row)).join("\n");

  const dataBytes = new TextEncoder().encode(dataContent);
  const dataChecksum = sha256Hex(dataBytes);

  const { error: uploadDataError } = await admin.storage
    .from(TENANT_EXPORT_STORAGE_BUCKET)
    .upload(dataPath, dataBytes, {
      upsert: true,
      contentType: exportRow.format === "csv" ? "text/csv" : "application/x-ndjson",
    });

  if (uploadDataError) {
    throw new Error(
      safeErrorMessage(uploadDataError, "Failed to upload tenant export data bundle")
    );
  }

  const [billingMetadataPointer, skillsMetadata] = await Promise.all([
    fetchBillingMetadataPointer(admin, exportRow.customer_id),
    fetchSkillsMetadata(admin, exportRow, tenantAgentRows),
  ]);

  const manifest = {
    export_id: exportRow.id,
    tenant_id: exportRow.tenant_id,
    customer_id: exportRow.customer_id,
    generated_at: new Date().toISOString(),
    scope: exportRow.export_scope,
    format: exportRow.format,
    include_blobs: exportRow.include_blobs,
    checksums: {
      [dataFileName]: dataChecksum,
    },
    rows_by_table: tableCounts,
    billing_metadata_pointer: billingMetadataPointer,
    skills_metadata: skillsMetadata,
  };

  const manifestContent = JSON.stringify(manifest, null, 2);
  const manifestBytes = new TextEncoder().encode(manifestContent);
  const manifestChecksum = sha256Hex(manifestBytes);

  const { error: uploadManifestError } = await admin.storage
    .from(TENANT_EXPORT_STORAGE_BUCKET)
    .upload(manifestPath, manifestBytes, {
      upsert: true,
      contentType: "application/json",
    });

  if (uploadManifestError) {
    throw new Error(
      safeErrorMessage(uploadManifestError, "Failed to upload tenant export manifest")
    );
  }

  const files: TenantExportFileInsert[] = [
    {
      file_name: dataFileName,
      file_type: exportRow.format === "csv" ? "csv" : "jsonl",
      storage_bucket: TENANT_EXPORT_STORAGE_BUCKET,
      storage_path: dataPath,
      checksum_sha256: dataChecksum,
      size_bytes: dataBytes.byteLength,
    },
    {
      file_name: "manifest.json",
      file_type: "manifest",
      storage_bucket: TENANT_EXPORT_STORAGE_BUCKET,
      storage_path: manifestPath,
      checksum_sha256: manifestChecksum,
      size_bytes: manifestBytes.byteLength,
    },
  ];

  return {
    manifestPath,
    files,
    totalSizeBytes: files.reduce((sum, file) => sum + file.size_bytes, 0),
  };
}

function normalizeExportRow(value: unknown): TenantExportRecord {
  return value as TenantExportRecord;
}

function normalizeExportJobRow(value: unknown): TenantExportJobRecord {
  const row = value as TenantExportJobRecord;
  if (!row.metadata || typeof row.metadata !== "object") {
    row.metadata = {};
  }
  return row;
}

export async function listTenantExports(
  admin: SupabaseClient,
  tenantId: string,
  limit = 20
): Promise<TenantExportRecord[]> {
  const cappedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const { data, error } = await admin
    .from("tenant_exports")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(cappedLimit);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load tenant exports"));
  }

  return Array.isArray(data) ? data.map(normalizeExportRow) : [];
}

export async function getTenantExport(
  admin: SupabaseClient,
  tenantId: string,
  exportId: string
): Promise<TenantExportRecord | null> {
  const { data, error } = await admin
    .from("tenant_exports")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", exportId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve tenant export"));
  }

  return data ? normalizeExportRow(data) : null;
}

export async function listTenantExportJobs(
  admin: SupabaseClient,
  tenantId: string,
  exportId: string
): Promise<TenantExportJobRecord[]> {
  const { data, error } = await admin
    .from("tenant_export_jobs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("export_id", exportId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load tenant export jobs"));
  }

  return Array.isArray(data) ? data.map(normalizeExportJobRow) : [];
}

export async function listTenantExportFiles(
  admin: SupabaseClient,
  tenantId: string,
  exportId: string
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await admin
    .from("tenant_export_files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("export_id", exportId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load tenant export files"));
  }

  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

export async function createTenantExport(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    requestedBy: string;
    exportScope: TenantExportScope;
    format: TenantExportFormat;
    includeBlobs: boolean;
    idempotencyKey: string;
  }
): Promise<{ export: TenantExportRecord; job: TenantExportJobRecord; reused: boolean }> {
  const { data: recentJobs, error: recentJobsError } = await admin
    .from("tenant_export_jobs")
    .select("id, export_id, metadata")
    .eq("tenant_id", input.tenantId)
    .eq("job_kind", "export")
    .order("created_at", { ascending: false })
    .limit(20);

  if (recentJobsError) {
    throw new Error(safeErrorMessage(recentJobsError, "Failed to inspect existing export jobs"));
  }

  if (Array.isArray(recentJobs)) {
    for (const candidate of recentJobs) {
      const metadata = (candidate as { metadata?: unknown }).metadata;
      if (
        metadata &&
        typeof metadata === "object" &&
        (metadata as { idempotency_key?: unknown }).idempotency_key === input.idempotencyKey
      ) {
        const existingExport = await getTenantExport(
          admin,
          input.tenantId,
          (candidate as { export_id: string }).export_id
        );
        if (existingExport) {
          const jobs = await listTenantExportJobs(admin, input.tenantId, existingExport.id);
          return {
            export: existingExport,
            job: jobs[0],
            reused: true,
          };
        }
      }
    }
  }

  const { data: createdExport, error: createExportError } = await admin
    .from("tenant_exports")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      requested_by: input.requestedBy,
      export_scope: input.exportScope,
      format: input.format,
      include_blobs: input.includeBlobs,
      status: "queued",
    })
    .select("*")
    .single();

  if (createExportError || !createdExport) {
    throw new Error(safeErrorMessage(createExportError, "Failed to create tenant export"));
  }

  const { data: createdJob, error: createJobError } = await admin
    .from("tenant_export_jobs")
    .insert({
      export_id: (createdExport as TenantExportRecord).id,
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      job_kind: "export",
      status: "queued",
      attempt: 1,
      metadata: {
        idempotency_key: input.idempotencyKey,
      },
    })
    .select("*")
    .single();

  if (createJobError || !createdJob) {
    throw new Error(safeErrorMessage(createJobError, "Failed to create tenant export job"));
  }

  return {
    export: normalizeExportRow(createdExport),
    job: normalizeExportJobRow(createdJob),
    reused: false,
  };
}

export async function retryTenantExport(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    exportId: string;
    userId: string;
  }
): Promise<{ export: TenantExportRecord; job: TenantExportJobRecord }> {
  const exportRow = await getTenantExport(admin, input.tenantId, input.exportId);
  if (!exportRow) {
    throw {
      status: 404,
      message: "Tenant export not found",
    };
  }

  if (exportRow.status === "queued" || exportRow.status === "running") {
    throw {
      status: 409,
      message: "Tenant export is already in progress",
    };
  }

  const previousJobs = await listTenantExportJobs(admin, input.tenantId, exportRow.id);
  const nextAttempt = (previousJobs[0]?.attempt || 1) + 1;

  const { data: updatedExport, error: updateExportError } = await admin
    .from("tenant_exports")
    .update({
      status: "queued",
      started_at: null,
      completed_at: null,
      expires_at: null,
      last_error: null,
      manifest_path: null,
      file_count: 0,
      total_size_bytes: 0,
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.exportId)
    .select("*")
    .single();

  if (updateExportError || !updatedExport) {
    throw new Error(safeErrorMessage(updateExportError, "Failed to reset tenant export"));
  }

  const { error: deleteFilesError } = await admin
    .from("tenant_export_files")
    .delete()
    .eq("tenant_id", input.tenantId)
    .eq("export_id", input.exportId);

  if (deleteFilesError) {
    throw new Error(
      safeErrorMessage(deleteFilesError, "Failed to clear previous tenant export files")
    );
  }

  const { data: createdJob, error: createJobError } = await admin
    .from("tenant_export_jobs")
    .insert({
      export_id: input.exportId,
      tenant_id: input.tenantId,
      customer_id: (updatedExport as TenantExportRecord).customer_id,
      job_kind: "export",
      status: "queued",
      attempt: nextAttempt,
      metadata: {
        retry_request_id: randomUUID(),
        retried_by: input.userId,
      },
    })
    .select("*")
    .single();

  if (createJobError || !createdJob) {
    throw new Error(safeErrorMessage(createJobError, "Failed to queue retry export job"));
  }

  return {
    export: normalizeExportRow(updatedExport),
    job: normalizeExportJobRow(createdJob),
  };
}

export async function claimTenantExportJobs(
  admin: SupabaseClient,
  input: {
    workerId: string;
    limit: number;
    leaseSeconds: number;
  }
): Promise<Array<{ job: TenantExportJobRecord; export: TenantExportRecord }>> {
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + input.leaseSeconds * 1000).toISOString();

  const { data, error } = await admin
    .from("tenant_export_jobs")
    .select("*")
    .eq("job_kind", "export")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, Math.floor(input.limit))));

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load queued tenant export jobs"));
  }

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const claims: Array<{ job: TenantExportJobRecord; export: TenantExportRecord }> = [];

  for (const candidate of data) {
    const job = normalizeExportJobRow(candidate);

    const { data: claimed, error: claimError } = await admin
      .from("tenant_export_jobs")
      .update({
        status: "running",
        worker_id: input.workerId,
        lock_expires_at: lockExpiresAt,
        started_at: now.toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (claimError || !claimed) {
      continue;
    }

    const exportRow = await getTenantExport(admin, job.tenant_id, job.export_id);
    if (!exportRow) {
      continue;
    }

    claims.push({
      job: normalizeExportJobRow(claimed),
      export: exportRow,
    });
  }

  return claims;
}

async function markTenantExportRunning(
  admin: SupabaseClient,
  exportRow: TenantExportRecord
): Promise<void> {
  const { error } = await admin
    .from("tenant_exports")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", exportRow.id)
    .eq("tenant_id", exportRow.tenant_id);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to mark tenant export running"));
  }
}

async function markTenantExportFailed(
  admin: SupabaseClient,
  exportRow: TenantExportRecord,
  errorMessage: string
): Promise<void> {
  const { error } = await admin
    .from("tenant_exports")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      last_error: errorMessage,
    })
    .eq("id", exportRow.id)
    .eq("tenant_id", exportRow.tenant_id);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to mark tenant export failed"));
  }
}

async function markTenantExportCompleted(
  admin: SupabaseClient,
  exportRow: TenantExportRecord,
  bundle: TenantExportBundleResult
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("tenant_exports")
    .update({
      status: "completed",
      manifest_path: bundle.manifestPath,
      file_count: bundle.files.length,
      total_size_bytes: bundle.totalSizeBytes,
      completed_at: now,
      expires_at: addDaysIso(EXPORT_EXPIRY_DAYS),
      last_error: null,
    })
    .eq("id", exportRow.id)
    .eq("tenant_id", exportRow.tenant_id);

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to finalize tenant export"));
  }
}

async function replaceTenantExportFiles(
  admin: SupabaseClient,
  exportRow: TenantExportRecord,
  files: TenantExportFileInsert[]
): Promise<void> {
  const { error: deleteError } = await admin
    .from("tenant_export_files")
    .delete()
    .eq("export_id", exportRow.id)
    .eq("tenant_id", exportRow.tenant_id);

  if (deleteError) {
    throw new Error(safeErrorMessage(deleteError, "Failed to clear previous export files"));
  }

  const { error: insertError } = await admin.from("tenant_export_files").insert(
    files.map((file) => ({
      export_id: exportRow.id,
      tenant_id: exportRow.tenant_id,
      customer_id: exportRow.customer_id,
      file_name: file.file_name,
      file_type: file.file_type,
      storage_bucket: file.storage_bucket,
      storage_path: file.storage_path,
      checksum_sha256: file.checksum_sha256,
      size_bytes: file.size_bytes,
    }))
  );

  if (insertError) {
    throw new Error(safeErrorMessage(insertError, "Failed to insert export file metadata"));
  }
}

async function createSignedManifestBundle(
  admin: SupabaseClient,
  exportRow: TenantExportRecord,
  files: TenantExportFileInsert[]
): Promise<void> {
  const signedUrls: Record<string, string> = {};
  for (const file of files) {
    const { data, error } = await admin.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, EXPORT_DOWNLOAD_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw new Error(
        safeErrorMessage(error, "Failed to create signed URL for tenant export artifact")
      );
    }

    signedUrls[file.file_name] = data.signedUrl;
  }

  const signedManifest = {
    export_id: exportRow.id,
    generated_at: new Date().toISOString(),
    expires_in_seconds: EXPORT_DOWNLOAD_TTL_SECONDS,
    urls: signedUrls,
  };

  const content = JSON.stringify(signedManifest, null, 2);
  const bytes = new TextEncoder().encode(content);
  const checksum = sha256Hex(bytes);
  const signedManifestPath = `${exportRow.tenant_id}/${exportRow.id}/manifest.signed.json`;

  const { error: uploadError } = await admin.storage
    .from(TENANT_EXPORT_STORAGE_BUCKET)
    .upload(signedManifestPath, bytes, {
      upsert: true,
      contentType: "application/json",
    });

  if (uploadError) {
    throw new Error(
      safeErrorMessage(uploadError, "Failed to upload signed tenant export manifest")
    );
  }

  const { error: insertError } = await admin.from("tenant_export_files").insert({
    export_id: exportRow.id,
    tenant_id: exportRow.tenant_id,
    customer_id: exportRow.customer_id,
    file_name: "manifest.signed.json",
    file_type: "signed_manifest",
    storage_bucket: TENANT_EXPORT_STORAGE_BUCKET,
    storage_path: signedManifestPath,
    checksum_sha256: checksum,
    size_bytes: bytes.byteLength,
  });

  if (insertError) {
    throw new Error(
      safeErrorMessage(insertError, "Failed to record signed manifest export metadata")
    );
  }
}

export async function processTenantExportJob(
  admin: SupabaseClient,
  claim: { job: TenantExportJobRecord; export: TenantExportRecord },
  workerId: string
): Promise<{ status: "completed" | "failed"; exportId: string; error?: string }> {
  try {
    await markTenantExportRunning(admin, claim.export);

    const bundle = await buildTenantExportBundle(admin, claim.export);
    await replaceTenantExportFiles(admin, claim.export, bundle.files);
    await createSignedManifestBundle(admin, claim.export, bundle.files);
    await markTenantExportCompleted(admin, claim.export, bundle);

    const { error: completeJobError } = await admin
      .from("tenant_export_jobs")
      .update({
        status: "completed",
        lock_expires_at: null,
        worker_id: workerId,
        completed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", claim.job.id)
      .eq("tenant_id", claim.job.tenant_id);

    if (completeJobError) {
      throw new Error(
        safeErrorMessage(completeJobError, "Failed to mark tenant export job completed")
      );
    }

    return {
      status: "completed",
      exportId: claim.export.id,
    };
  } catch (error) {
    const message = safeErrorMessage(error, "Tenant export processing failed");

    try {
      await markTenantExportFailed(admin, claim.export, message);
      await admin
        .from("tenant_export_jobs")
        .update({
          status: "failed",
          lock_expires_at: null,
          worker_id: workerId,
          completed_at: new Date().toISOString(),
          last_error: message,
        })
        .eq("id", claim.job.id)
        .eq("tenant_id", claim.job.tenant_id);
    } catch {
      // Best-effort failure transitions for worker loop.
    }

    return {
      status: "failed",
      exportId: claim.export.id,
      error: message,
    };
  }
}
