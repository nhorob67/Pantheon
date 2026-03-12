import { z } from "zod/v4";

/** Accepts custom skill slugs (custom-*) and any other skill identifiers */
const skillSlugSchema = z.string().regex(
  /^[a-z0-9][a-z0-9-]{0,61}$/,
  "Invalid skill slug"
);

export const createAgentSchema = z.object({
  display_name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
  role: z.string().min(5, "Role must be at least 5 characters").max(200).optional().or(z.literal("")),
  goal: z.string().max(500).optional().or(z.literal("")),
  backstory: z.string().max(2000).optional().or(z.literal("")),
  autonomy_level: z.enum(["assisted", "copilot", "autopilot"] as const),
  discord_channel_id: z
    .string()
    .regex(/^\d{17,20}$/, "Enter a valid Discord channel ID (17-20 digits)")
    .optional()
    .or(z.literal("")),
  discord_channel_name: z.string().max(100).optional().or(z.literal("")),
  is_default: z.boolean(),
  skills: z.array(skillSlugSchema),
  /** @deprecated Schedules are managed via tenant_scheduled_messages. Accepted for backward compat. */
  cron_jobs: z.record(z.string().max(80), z.boolean()).optional(),
  composio_toolkits: z.array(z.string().max(80)).max(50).optional(),
  can_delegate: z.boolean().optional(),
  can_receive_delegation: z.boolean().optional(),
  tool_approval_overrides: z.record(z.string().max(80), z.enum(["auto", "confirm", "disabled"])).optional(),
});

export const agentPreviewSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const updateAgentSchema = z.object({
  display_name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .optional(),
  role: z.string().min(5, "Role must be at least 5 characters").max(200).optional(),
  goal: z.string().max(500).optional().or(z.literal("")),
  backstory: z.string().max(2000).optional().or(z.literal("")),
  autonomy_level: z.enum(["assisted", "copilot", "autopilot"] as const).optional(),
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
  composio_toolkits: z.array(z.string().max(80)).max(50).optional(),
  can_delegate: z.boolean().optional(),
  can_receive_delegation: z.boolean().optional(),
  tool_approval_overrides: z.record(z.string().max(80), z.enum(["auto", "confirm", "disabled"])).optional(),
});

export type CreateAgentData = z.infer<typeof createAgentSchema>;
export type UpdateAgentData = z.infer<typeof updateAgentSchema>;
