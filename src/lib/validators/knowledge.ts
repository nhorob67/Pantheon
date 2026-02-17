import { z } from "zod/v4";

/** Validates the agent_id field for upload and reassignment */
const agentIdSchema = z
  .string()
  .uuid("Invalid agent ID")
  .nullable()
  .optional()
  .transform((v) => v || null);

/** Validates the upload FormData — file validation happens separately in the route */
export const knowledgeUploadSchema = z.object({
  agent_id: agentIdSchema,
});

/** Validates agent reassignment */
export const knowledgeUpdateSchema = z.object({
  agent_id: agentIdSchema,
});

export type KnowledgeUploadData = z.infer<typeof knowledgeUploadSchema>;
export type KnowledgeUpdateData = z.infer<typeof knowledgeUpdateSchema>;
