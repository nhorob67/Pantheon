import { z } from "zod/v4";
import { PERSONALITY_PRESETS } from "@/types/agent";

/** Accepts built-in (farm-*) and custom (custom-*) skill slugs */
const skillSlugSchema = z.string().regex(
  /^(farm-|custom-)[a-z0-9][a-z0-9-]{0,61}$/,
  "Invalid skill slug"
);

export const createAgentSchema = z
  .object({
    display_name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be 50 characters or less"),
    personality_preset: z.enum(PERSONALITY_PRESETS, {
      message: "Select a personality",
    }),
    custom_personality: z.string().max(5000).optional(),
    discord_channel_id: z
      .string()
      .regex(/^\d{17,20}$/, "Enter a valid Discord channel ID (17-20 digits)")
      .optional()
      .or(z.literal("")),
    discord_channel_name: z.string().max(100).optional().or(z.literal("")),
    is_default: z.boolean(),
    skills: z.array(skillSlugSchema),
    cron_jobs: z.record(z.string().max(80), z.boolean()),
  })
  .refine(
    (data) => {
      if (data.personality_preset === "custom") {
        return (
          data.custom_personality !== undefined &&
          data.custom_personality.length >= 10
        );
      }
      return true;
    },
    {
      message: "Custom personality must be at least 10 characters",
      path: ["custom_personality"],
    }
  );

export const updateAgentSchema = z
  .object({
    display_name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be 50 characters or less")
      .optional(),
    personality_preset: z
      .enum(PERSONALITY_PRESETS, { message: "Select a personality" })
      .optional(),
    custom_personality: z.string().max(5000).optional(),
    discord_channel_id: z
      .string()
      .regex(/^\d{17,20}$/, "Enter a valid Discord channel ID (17-20 digits)")
      .optional()
      .or(z.literal("")),
    discord_channel_name: z.string().max(100).optional().or(z.literal("")),
    is_default: z.boolean().optional(),
    skills: z.array(skillSlugSchema).optional(),
    cron_jobs: z
      .record(z.string().max(80), z.boolean())
      .optional(),
  })
  .refine(
    (data) => {
      if (data.personality_preset === "custom") {
        return (
          data.custom_personality !== undefined &&
          data.custom_personality.length >= 10
        );
      }
      return true;
    },
    {
      message: "Custom personality must be at least 10 characters",
      path: ["custom_personality"],
    }
  );

export type CreateAgentData = z.infer<typeof createAgentSchema>;
export type UpdateAgentData = z.infer<typeof updateAgentSchema>;
