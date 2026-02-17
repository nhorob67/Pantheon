import { z } from "zod/v4";

export const createMcpServerSchema = z.object({
  server_key: z
    .string()
    .min(1, "Key is required")
    .max(50, "Key must be 50 characters or less")
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      "Key must be lowercase letters, numbers, and hyphens"
    ),
  display_name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  command: z
    .string()
    .min(1, "Command is required")
    .max(500),
  args: z.array(z.string().max(500)).default([]),
  env_vars: z.record(z.string(), z.string()).default({}),
  scope: z.enum(["instance", "agent"]).default("instance"),
  agent_id: z.string().uuid().nullable().optional(),
  enabled: z.boolean().default(true),
});

export const updateMcpServerSchema = createMcpServerSchema.partial();

export type CreateMcpServerData = z.infer<typeof createMcpServerSchema>;
export type UpdateMcpServerData = z.infer<typeof updateMcpServerSchema>;
