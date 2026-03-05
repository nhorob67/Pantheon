import { z } from "zod/v4";
import { US_STATES, CA_PROVINCES, BUSINESS_TYPES } from "@/types/farm";

const allRegionCodes: string[] = [
  ...US_STATES.map((s) => s.code),
  ...CA_PROVINCES.map((p) => p.code),
];

export const operationSchema = z.object({
  operation_name: z.string().min(1, "Operation name is required").max(100),
  business_type: z.enum(BUSINESS_TYPES).nullable().optional(),
  country: z.enum(["US", "CA"] as const),
  state: z.string().refine((v) => allRegionCodes.includes(v), {
    message: "Select a state or province",
  }),
  county: z.string().optional(),
});

export const locationSchema = z
  .object({
    weather_location: z.string().min(1, "Enter a town or zip/postal code"),
    weather_lat: z.number(),
    weather_lng: z.number(),
    timezone: z.string().min(1, "Timezone is required"),
  })
  .refine((d) => d.weather_lat !== 0 || d.weather_lng !== 0, {
    message: "Use the Locate button to set coordinates",
    path: ["weather_lat"],
  });

export const discordSchema = z.union([
  z.object({
    discord_guild_id: z
      .string()
      .min(17, "Server ID must be 17-20 digits")
      .max(20, "Server ID must be 17-20 digits")
      .regex(/^\d+$/, "Server ID must be numeric"),
    skipped: z.literal(false),
  }),
  z.object({ skipped: z.literal(true) }),
]);

export type OperationData = z.infer<typeof operationSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type DiscordData = z.infer<typeof discordSchema>;
