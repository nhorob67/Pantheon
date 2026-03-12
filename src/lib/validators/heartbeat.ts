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
  cooldown_minutes: z.number().int().min(5).max(1440).default(120),
  max_alerts_per_day: z.number().int().min(1).max(50).default(6),
  digest_enabled: z.boolean().default(false),
  digest_window_minutes: z.number().int().min(15).max(1440).default(120),
  reminder_interval_minutes: z.number().int().min(30).max(10080).default(1440),
  heartbeat_instructions: z.string().max(1000).default(""),
});

export const upsertAgentHeartbeatOverrideSchema = upsertHeartbeatConfigSchema;

export type UpsertHeartbeatConfigData = z.infer<typeof upsertHeartbeatConfigSchema>;

export const runHeartbeatNowSchema = z.object({
  config_id: z.uuid().optional(),
  preview_only: z.boolean().default(false),
});

export const sendHeartbeatTestSchema = z.object({
  config_id: z.uuid().optional(),
});

export const heartbeatIssueSnoozeSchema = z.object({
  minutes: z.number().int().min(30).max(10080),
});

export const heartbeatReportModeSchema = z.enum([
  "overview",
  "runs",
  "trends",
  "audit",
]);

const optionalUuidParam = z.union([z.uuid(), z.literal("all"), z.literal("")]).optional()
  .transform((value) => (value && value !== "all" ? value : undefined));

const optionalDateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const optionalSearchParam = z.string().trim().max(120).optional();

export const heartbeatRunsReportQuerySchema = z.object({
  config_id: optionalUuidParam,
  delivery_status: z.enum([
    "not_applicable",
    "suppressed",
    "deferred",
    "awaiting_approval",
    "queued",
    "dispatched",
    "dispatch_failed",
    "preview",
  ]).optional(),
  trigger_mode: z.enum([
    "scheduled",
    "manual_run",
    "manual_preview",
    "manual_test",
  ]).optional(),
  signal_type: z.string().trim().max(80).optional(),
  date_from: optionalDateParam,
  date_to: optionalDateParam,
  query: optionalSearchParam,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(5).max(100).default(25),
});

export const heartbeatTrendsReportQuerySchema = z.object({
  config_id: optionalUuidParam,
  date_from: optionalDateParam,
  date_to: optionalDateParam,
});

export const heartbeatAuditReportQuerySchema = z.object({
  config_id: optionalUuidParam,
  kind: z.enum([
    "operator_event",
    "manual_preview",
    "manual_run",
    "manual_test",
    "approval_requested",
    "approval_approved",
    "approval_rejected",
    "manual_action",
    "approval",
  ]).optional(),
  date_from: optionalDateParam,
  date_to: optionalDateParam,
  query: optionalSearchParam,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(5).max(100).default(25),
});
