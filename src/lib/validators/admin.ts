import { z } from "zod/v4";

export const customerFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  status: z
    .enum(["active", "past_due", "canceled", "incomplete"])
    .optional(),
  state: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type CustomerFilters = z.infer<typeof customerFiltersSchema>;
