import { z } from "zod/v4";

export const enableComposioSchema = z.object({
  instance_id: z.string().uuid(),
});

export const updateComposioSchema = z.object({
  enabled: z.boolean().optional(),
  selected_toolkits: z.array(z.string().min(1).max(100)).max(50).optional(),
});

export const composioOAuthInitSchema = z.object({
  app_id: z.string().min(1).max(100),
  redirect_url: z.string().url().optional(),
});

export const composioToolkitUpdateSchema = z.object({
  selected_toolkits: z.array(z.string().min(1).max(100)).max(50),
});
