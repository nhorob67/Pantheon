import { z } from "zod/v4";
import { CronExpressionParser } from "cron-parser";

/** Validates a 5-field cron expression */
export const cronExpressionSchema = z
  .string()
  .min(5)
  .max(100)
  .refine(
    (val) => {
      try {
        CronExpressionParser.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid cron expression" }
  );

const VALID_TIMEZONES = [
  "America/Chicago",
  "America/Denver",
  "America/New_York",
  "America/Los_Angeles",
  "America/Winnipeg",
  "America/Regina",
] as const;

export const createCustomScheduleSchema = z.object({
  display_name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  prompt: z
    .string()
    .min(5, "Prompt must be at least 5 characters")
    .max(2000, "Prompt must be 2000 characters or less"),
  cron_expression: cronExpressionSchema,
  timezone: z.enum(VALID_TIMEZONES, {
    message: "Select a valid timezone",
  }),
  agent_id: z.string().uuid("Invalid agent ID"),
  channel_id: z.string().min(1, "Channel ID is required"),
  tools: z.array(z.string()).default([]),
});

export const updateCustomScheduleSchema = z.object({
  display_name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  prompt: z
    .string()
    .min(5, "Prompt must be at least 5 characters")
    .max(2000, "Prompt must be 2000 characters or less")
    .optional(),
  cron_expression: cronExpressionSchema.optional(),
  timezone: z
    .enum(VALID_TIMEZONES, { message: "Select a valid timezone" })
    .optional(),
  tools: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  notify_on_failure: z.boolean().optional(),
});

/** Schema for toggling notification preferences on any schedule (not just custom) */
export const updateScheduleNotificationsSchema = z.object({
  notify_on_failure: z.boolean(),
});

export type CreateCustomScheduleData = z.infer<typeof createCustomScheduleSchema>;
export type UpdateCustomScheduleData = z.infer<typeof updateCustomScheduleSchema>;
