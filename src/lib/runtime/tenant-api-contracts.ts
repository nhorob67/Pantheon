import { z } from "zod/v4";
import { discordCanaryIngressSchema } from "../validators/tenant-runtime.ts";

export const tenantRouteParamsSchema = z.object({
  tenantId: z.uuid(),
});

export const tenantApprovalDecisionRouteParamsSchema = tenantRouteParamsSchema.extend({
  approvalId: z.uuid(),
});

export const tenantApiErrorSchema = z.object({
  message: z.string(),
  details: z.unknown().optional(),
});

export const tenantApiEnvelopeSchema = z.object({
  version: z.string().min(1),
  request_id: z.string().min(1),
  idempotency_key: z.string().nullable(),
  idempotency_replayed: z.boolean(),
  data: z.unknown(),
  error: tenantApiErrorSchema.nullable(),
});

export const createTenantExportRequestSchema = z
  .object({
    export_scope: z.enum(["full", "knowledge_only", "metadata_only"]).default("full"),
    format: z.enum(["jsonl", "csv"]).default("jsonl"),
    include_blobs: z.boolean().default(true),
  })
  .strict();

export const tenantApprovalDecisionRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(1000).optional(),
});

export const tenantApprovalDecisionDataSchema = z.object({
  approval_id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
});

export const tenantExportQueuedDataSchema = z.object({
  export: z.record(z.string(), z.unknown()),
  job: z.record(z.string(), z.unknown()),
  reused: z.boolean(),
});

export const tenantDiscordIngressAcceptedDataSchema = z.object({
  run: z.record(z.string(), z.unknown()),
  accepted: z.literal(true),
  worker_endpoint: z.literal("/api/admin/tenants/runtime/process"),
});

const tenantImportDryRunRecordSchema = z.object({
  table: z.string().trim().min(1).max(120),
  record: z.record(z.string(), z.unknown()),
});

export const tenantImportDryRunRequestSchema = z
  .object({
    schema_version: z.int().default(1),
    format: z.enum(["jsonl", "csv"]).default("jsonl"),
    scope: z.enum(["full", "knowledge_only", "metadata_only"]).default("full"),
    strict_tenant_match: z.boolean().default(true),
    fail_on_unknown_tables: z.boolean().default(true),
    selected_tables: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
    records: z.array(tenantImportDryRunRecordSchema).max(5000),
    manifest: z
      .object({
        format: z.enum(["jsonl", "csv"]).optional(),
        rows_by_table: z.record(z.string(), z.int().nonnegative()).optional(),
      })
      .optional(),
  })
  .strict();

export const tenantImportDryRunIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  code: z.string().min(1),
  message: z.string().min(1),
  table: z.string().optional(),
  record_index: z.int().nonnegative().optional(),
});

export const tenantImportDryRunDataSchema = z.object({
  accepted: z.boolean(),
  compatibility: z.object({
    status: z.enum(["compatible", "requires_migration", "unsupported"]),
    schema_version: z.int(),
    supported_version: z.int(),
    message: z.string().min(1),
  }),
  summary: z.object({
    records_total: z.int().nonnegative(),
    tables_detected: z.int().nonnegative(),
    errors: z.int().nonnegative(),
    warnings: z.int().nonnegative(),
    unknown_tables: z.int().nonnegative(),
    tenant_mismatches: z.int().nonnegative(),
  }),
  issues: z.array(tenantImportDryRunIssueSchema),
});

export { discordCanaryIngressSchema };

export type TenantApiEnvelope = z.infer<typeof tenantApiEnvelopeSchema>;
export type CreateTenantExportRequest = z.infer<typeof createTenantExportRequestSchema>;
export type TenantApprovalDecisionRequest = z.infer<typeof tenantApprovalDecisionRequestSchema>;
export type TenantImportDryRunRequest = z.infer<typeof tenantImportDryRunRequestSchema>;
