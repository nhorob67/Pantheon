import { z } from "zod/v4";
import { SUPPORTED_STATES, CROPS } from "@/types/farm";

export const farmProfileSchema = z.object({
  farm_name: z.string().min(1, "Farm name is required").max(100),
  state: z.enum(SUPPORTED_STATES, { message: "Select a state" }),
  county: z.string().min(1, "County is required"),
  primary_crops: z
    .array(z.enum(CROPS))
    .min(1, "Select at least one crop"),
  acres: z.number().int().positive("Enter your total acres"),
});

export type FarmProfileFormData = z.infer<typeof farmProfileSchema>;
