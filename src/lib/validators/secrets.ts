import { z } from "zod/v4";

export const createSecretSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(100, "Label must be 100 characters or fewer")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Label must contain only letters, numbers, hyphens, and underscores"
    ),
  description: z.string().max(500).optional(),
  value: z.string().min(1, "Secret value is required").max(10_000),
  usage_mode: z.enum(["inject", "break_glass"]).default("inject"),
  inject_scheme: z.enum(["bearer", "basic", "header", "query_param"]).default("bearer"),
  inject_header_name: z.string().max(200).optional(),
  inject_param_name: z.string().max(200).optional(),
  allowed_agent_ids: z.array(z.uuid()).max(20).optional(),
  allowed_domains: z
    .array(z.string().min(1).max(253))
    .max(50)
    .optional(),
});

export const updateSecretSchema = z.object({
  description: z.string().max(500).optional(),
  value: z.string().min(1).max(10_000).optional(),
  usage_mode: z.enum(["inject", "break_glass"]).optional(),
  inject_scheme: z.enum(["bearer", "basic", "header", "query_param"]).optional(),
  inject_header_name: z.string().max(200).nullable().optional(),
  inject_param_name: z.string().max(200).nullable().optional(),
  allowed_agent_ids: z.array(z.uuid()).max(20).nullable().optional(),
  allowed_domains: z.array(z.string().min(1).max(253)).max(50).nullable().optional(),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;
