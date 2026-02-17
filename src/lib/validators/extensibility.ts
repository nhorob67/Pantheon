import { z } from "zod/v4";

const extensionKindValues = [
  "skill",
  "plugin",
  "connector",
  "mcp_server",
  "tool_pack",
] as const;

const extensionSourceTypeValues = [
  "local",
  "npm",
  "git",
  "clawhub",
  "internal",
] as const;

const booleanParamSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const extensionCatalogFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  kind: z.enum(extensionKindValues).optional(),
  source_type: z.enum(extensionSourceTypeValues).optional(),
  verified: booleanParamSchema.optional(),
  active: booleanParamSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type ExtensionCatalogFilters = z.infer<typeof extensionCatalogFiltersSchema>;

const slugParamSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{1,63}$/);

export const extensionInstallRequestSchema = z
  .object({
    item_id: z.uuid().optional(),
    slug: slugParamSchema.optional(),
    version_id: z.uuid().optional(),
    instance_id: z.uuid().optional(),
    pin_version: z.boolean().default(false),
  })
  .refine((value) => !!value.item_id || !!value.slug, {
    message: "Either item_id or slug is required",
    path: ["item_id"],
  });

export type ExtensionInstallRequest = z.infer<typeof extensionInstallRequestSchema>;

export const extensionRollbackRequestSchema = z.object({
  target_version_id: z.uuid().optional(),
});

export type ExtensionRollbackRequest = z.infer<typeof extensionRollbackRequestSchema>;

const extensionSourceTypeSchema = z.enum(extensionSourceTypeValues);

export const extensionTrustPolicyUpdateSchema = z
  .object({
    allowed_source_types: z
      .array(extensionSourceTypeSchema)
      .min(1)
      .max(extensionSourceTypeValues.length),
    require_verified_source_types: z
      .array(extensionSourceTypeSchema)
      .default(["npm", "git", "clawhub"]),
  })
  .refine(
    (value) =>
      value.require_verified_source_types.every((sourceType) =>
        value.allowed_source_types.includes(sourceType)
      ),
    {
      message: "Verified-required source types must also be allowed",
      path: ["require_verified_source_types"],
    }
  );

export type ExtensionTrustPolicyUpdateRequest = z.infer<
  typeof extensionTrustPolicyUpdateSchema
>;

export const extensionRolloutCreateSchema = z.object({
  item_id: z.uuid().optional(),
  target_version_id: z.uuid(),
  customer_id: z.uuid().optional(),
  batch_sizes: z
    .object({
      canary: z.number().int().min(1).max(1000).default(1),
      standard: z.number().int().min(1).max(1000).default(10),
      delayed: z.number().int().min(1).max(1000).default(100),
    })
    .default({
      canary: 1,
      standard: 10,
      delayed: 100,
    }),
  gate_policy: z
    .object({
      max_failure_rate_pct: z.number().min(0).max(100).default(10),
      max_p95_latency_ms: z.number().int().min(1).default(10000),
      max_timeout_rate_pct: z.number().min(0).max(100).default(5),
      max_hard_error_rate_pct: z.number().min(0).max(100).default(3),
    })
    .default({
      max_failure_rate_pct: 10,
      max_p95_latency_ms: 10000,
      max_timeout_rate_pct: 5,
      max_hard_error_rate_pct: 3,
    }),
  notes: z.string().max(1000).optional(),
});

export type ExtensionRolloutCreateRequest = z.infer<
  typeof extensionRolloutCreateSchema
>;

export const extensionRolloutControlSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ExtensionRolloutControlRequest = z.infer<
  typeof extensionRolloutControlSchema
>;
