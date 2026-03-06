import { z } from "zod/v4";

export const updateModelPreferencesSchema = z.object({
  primary_model_id: z.string().min(1).max(200).nullable(),
  fast_model_id: z.string().min(1).max(200).nullable(),
});

export const adminUpdateModelSchema = z.object({
  tier_hint: z.enum(["primary", "fast", "both"]).optional(),
  description: z.string().max(1000).optional(),
});

export type UpdateModelPreferencesInput = z.infer<typeof updateModelPreferencesSchema>;
