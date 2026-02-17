import { z } from "zod/v4";
import {
  MEMORY_CAPTURE_LEVEL_VALUES,
  MEMORY_MODE_VALUES,
  MEMORY_OPERATION_TYPE_VALUES,
} from "@/types/memory";

const memoryModeSchema = z.enum(MEMORY_MODE_VALUES);
const memoryCaptureLevelSchema = z.enum(MEMORY_CAPTURE_LEVEL_VALUES);

const categorySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Categories must use lowercase letters, numbers, and hyphens"
  );

export const updateInstanceMemorySettingsSchema = z.object({
  mode: memoryModeSchema,
  capture_level: memoryCaptureLevelSchema,
  retention_days: z.number().int().min(7).max(3650),
  exclude_categories: z.array(categorySchema).max(50),
  auto_checkpoint: z.boolean(),
  auto_compress: z.boolean(),
});

export const memoryOperationTypeSchema = z.enum(MEMORY_OPERATION_TYPE_VALUES);

export const memoryOperationRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type UpdateInstanceMemorySettingsRequest = z.infer<
  typeof updateInstanceMemorySettingsSchema
>;

export type MemoryOperationRequest = z.infer<typeof memoryOperationRequestSchema>;
