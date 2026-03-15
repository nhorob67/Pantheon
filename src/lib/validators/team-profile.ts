import { z } from "zod/v4";

export const teamProfileSchema = z.object({
  team_name: z.string().min(1, "Team name is required").max(100),
  description: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  team_goal: z.string().max(500).optional(),
  timezone: z.string().min(1, "Timezone is required"),
  discord_completion_notifications_enabled: z.boolean().optional(),
});

export type TeamProfileFormData = z.infer<typeof teamProfileSchema>;
