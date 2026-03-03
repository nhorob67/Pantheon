import { z } from "zod/v4";

export const discordCanaryIngressSchema = z.object({
  guild_id: z.string().trim().min(1).max(64),
  channel_id: z.string().trim().min(1).max(64),
  user_id: z.string().trim().min(1).max(64),
  message_id: z.string().trim().min(1).max(128),
  content: z.string().trim().max(4000).default(""),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        content_type: z.string(),
        size: z.number(),
      })
    )
    .optional(),
});

export type DiscordCanaryIngressInput = z.infer<typeof discordCanaryIngressSchema>;
