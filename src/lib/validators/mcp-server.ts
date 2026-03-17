import { z } from "zod/v4";

const mcpServerFields = {
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
  transport: z.enum(["stdio", "sse"]).default("stdio"),
  // stdio transport fields
  command: z
    .string()
    .max(500)
    .default(""),
  args: z.array(z.string().max(500)).default([]),
  env_vars: z.record(z.string(), z.string()).default({}),
  // sse transport fields
  url: z.string().url().nullable().optional(),
  headers: z.record(z.string(), z.string()).default({}),
  // scope
  scope: z.enum(["instance", "agent"]).default("instance"),
  agent_id: z.string().uuid().nullable().optional(),
  enabled: z.boolean().default(true),
} satisfies z.ZodRawShape;

const mcpServerSchema = z.object(mcpServerFields);

function addTransportIssues(
  data: {
    transport?: "stdio" | "sse";
    command?: string;
    url?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.transport === "stdio" && (!data.command || data.command.length === 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["command"],
      message: "stdio transport requires a command",
    });
  }

  if (data.transport === "sse" && !data.url) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: "sse transport requires a URL",
    });
  }
}

export const createMcpServerSchema = mcpServerSchema.superRefine((data, ctx) => {
  addTransportIssues(data, ctx);
});

export const updateMcpServerSchema = mcpServerSchema.partial().superRefine((data, ctx) => {
  addTransportIssues(data, ctx);
});

export type CreateMcpServerData = z.infer<typeof createMcpServerSchema>;
export type UpdateMcpServerData = z.infer<typeof updateMcpServerSchema>;
