import { z } from "zod/v4";

const VALID_TIMEZONES = [
  "America/Chicago",
  "America/Denver",
  "America/New_York",
  "America/Los_Angeles",
  "America/Winnipeg",
  "America/Regina",
] as const;

export const VALID_INTERVALS = [15, 30, 60, 120, 240] as const;

export const heartbeatChecksSchema = z.object({
  weather_severe: z.boolean(),
  grain_price_movement: z.boolean(),
  grain_price_threshold_cents: z.number().int().min(1).max(100),
  unreviewed_tickets: z.boolean(),
  unreviewed_tickets_threshold_hours: z.number().int().min(1).max(48),
  unanswered_emails: z.boolean(),
  unanswered_emails_threshold_hours: z.number().int().min(1).max(48),
});

export const upsertHeartbeatConfigSchema = z.object({
  enabled: z.boolean(),
  interval_minutes: z.number().int().refine(
    (v) => (VALID_INTERVALS as readonly number[]).includes(v),
    { message: "Interval must be 15, 30, 60, 120, or 240 minutes" }
  ),
  timezone: z.enum(VALID_TIMEZONES, {
    message: "Select a valid timezone",
  }),
  active_hours_start: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  active_hours_end: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  checks: heartbeatChecksSchema,
  custom_checks: z.array(z.string().min(1).max(200)).max(10).default([]),
  delivery_channel_id: z.string().min(1).nullable().optional(),
});

export const upsertAgentHeartbeatOverrideSchema = upsertHeartbeatConfigSchema;

export type UpsertHeartbeatConfigData = z.infer<typeof upsertHeartbeatConfigSchema>;
