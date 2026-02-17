import { z } from "zod/v4";

export const createUpgradeSchema = z.object({
  target_version: z.string().min(1, "Version is required"),
  docker_image: z
    .string()
    .min(1, "Docker image is required")
    .refine(
      (val) => val.startsWith("farmclaw/") || val.startsWith("ghcr.io/farmclaw/"),
      "Docker image must start with 'farmclaw/' or 'ghcr.io/farmclaw/'"
    ),
  concurrency: z.number().int().min(1).max(20).default(3),
});

export const customerFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  status: z
    .enum(["active", "past_due", "canceled", "incomplete"])
    .optional(),
  state: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const instanceFiltersSchema = z.object({
  status: z
    .enum(["provisioning", "running", "stopped", "error"])
    .optional(),
  version: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUpgradeData = z.infer<typeof createUpgradeSchema>;
export type CustomerFilters = z.infer<typeof customerFiltersSchema>;
export type InstanceFilters = z.infer<typeof instanceFiltersSchema>;
