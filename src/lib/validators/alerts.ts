import { z } from "zod";

export const spendingCapSchema = z.object({
  spending_cap_cents: z
    .number()
    .int()
    .min(100)
    .max(100000)
    .nullable(),
  spending_cap_auto_pause: z.boolean(),
  alert_email: z.string().email().nullable(),
});

export type SpendingCapData = z.infer<typeof spendingCapSchema>;

export const alertPreferencesSchema = z.object({
  spending_alerts_enabled: z.boolean(),
  spending_alert_email: z.boolean(),
  spending_alert_dashboard: z.boolean(),
});

export type AlertPreferencesData = z.infer<typeof alertPreferencesSchema>;
