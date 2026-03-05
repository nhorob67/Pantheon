import { z } from "zod/v4";
import { US_STATES, CA_PROVINCES, CROPS } from "@/types/farm";

const allRegionCodes: string[] = [
  ...US_STATES.map((s) => s.code),
  ...CA_PROVINCES.map((p) => p.code),
];

export const farmProfileSchema = z.object({
  farm_name: z.string().min(1, "Farm name is required").max(100),
  state: z.string().refine((v) => allRegionCodes.includes(v), {
    message: "Select a valid state or province",
  }),
  county: z.string().optional(),
  primary_crops: z.array(z.enum(CROPS)).optional(),
  acres: z.number().int().positive("Enter your total acres").optional(),
});

export type FarmProfileFormData = z.infer<typeof farmProfileSchema>;
