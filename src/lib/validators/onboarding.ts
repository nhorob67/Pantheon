import { z } from "zod/v4";

export const teamSetupSchema = z.object({
  team_name: z
    .string()
    .min(3, "Team name must be at least 3 characters")
    .max(50, "Team name must be 50 characters or less"),
  team_goal: z.string().min(10, "Describe what your team should accomplish").max(500),
  timezone: z.string().min(1, "Timezone is required"),
});

export const firstAgentSchema = z.object({
  display_name: z
    .string()
    .min(2, "Agent name must be at least 2 characters")
    .max(50, "Agent name must be 50 characters or less"),
  role: z.string().min(5, "Describe what this agent is").max(200),
  goal: z.string().min(10, "Describe what this agent should accomplish").max(500),
  backstory: z.string().max(2000).optional().or(z.literal("")),
  autonomy_level: z.enum(["assisted", "copilot", "autopilot"] as const),
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

export type TeamSetupData = z.infer<typeof teamSetupSchema>;
export type FirstAgentData = z.infer<typeof firstAgentSchema>;
export type DiscordData = z.infer<typeof discordSchema>;
