import { z } from "zod/v4";

const slugSchema = z
  .string()
  .regex(/^custom-[a-z0-9][a-z0-9-]{0,58}$/, "Slug must start with 'custom-' followed by lowercase letters, numbers, and hyphens");

export const createCustomSkillSchema = z.object({
  slug: slugSchema,
  display_name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  skill_md: z.string().min(10, "Instructions must be at least 10 characters").max(50000),
  references: z.record(z.string().max(100), z.string().max(50000)).optional(),
  config_schema: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "active"]).optional(),
  template_id: z.string().max(100).optional(),
});

export const updateCustomSkillSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  skill_md: z.string().min(10).max(50000).optional(),
  references: z.record(z.string().max(100), z.string().max(50000)).optional(),
  config_schema: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  change_summary: z.string().max(500).optional(),
});

export const generateSkillSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(5000),
  template_id: z.string().max(100).optional(),
  farm_context: z.boolean().optional(),
});

export const testSkillSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
});

export type CreateCustomSkillData = z.infer<typeof createCustomSkillSchema>;
export type UpdateCustomSkillData = z.infer<typeof updateCustomSkillSchema>;
export type GenerateSkillData = z.infer<typeof generateSkillSchema>;
export type TestSkillData = z.infer<typeof testSkillSchema>;
