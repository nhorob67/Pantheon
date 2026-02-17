import { z } from "zod/v4";
import { SUPPORTED_STATES } from "@/types/farm";
import { CROPS } from "@/types/farm";

export const provisionRequestSchema = z.object({
  customer_id: z.string().uuid(),
  farm_profile: z.object({
    farm_name: z.string().min(1).max(100),
    state: z.enum(SUPPORTED_STATES),
    county: z.string().min(1).max(100),
    primary_crops: z.array(z.enum(CROPS)).min(1).max(10),
    acres: z.number().int().positive().max(100_000),
    elevators: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          url: z.string().url().max(500),
          crops: z.array(z.string().max(100)),
        })
      )
      .max(20),
    weather_location: z.string().min(1).max(200),
    weather_lat: z.number().min(40).max(49),
    weather_lng: z.number().min(-104).max(-89),
    timezone: z.enum(["America/Chicago", "America/Denver"]),
  }),
  channel: z.object({
    type: z.literal("discord"),
    token: z.string().min(1).max(200),
  }),
});
