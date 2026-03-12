import { z } from "zod/v4";

export const briefingConfigSchema = z.object({
  enabled: z.boolean(),
  send_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  timezone: z.string().default("America/Chicago"),
  channel_id: z.string().min(1),
  sections: z.object({
    conditions: z.boolean().default(true),
    external_updates: z.boolean().default(true),
    activity_recap: z.boolean().default(false),
  }),
});

export type BriefingConfig = z.infer<typeof briefingConfigSchema>;

export function briefingTimeToCron(sendTime: string, _timezone: string): string {
  // Convert local time + timezone to a UTC cron expression
  // sendTime is "HH:MM" in the given timezone
  const [hours, minutes] = sendTime.split(":").map(Number);

  // For Trigger.dev, we store the cron as-is and let the scheduler handle timezone
  // But for our own next_run_at computation, we need UTC
  // Store the raw cron, timezone is handled separately
  return `${minutes} ${hours} * * *`;
}

export function computeNextBriefingRun(sendTime: string, timezone: string): string {
  const [hours, minutes] = sendTime.split(":").map(Number);

  // Create a date in the target timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const currentHour = parseInt(get("hour"), 10);
  const currentMinute = parseInt(get("minute"), 10);

  // If the target time has already passed today, schedule for tomorrow
  const isToday =
    currentHour < hours || (currentHour === hours && currentMinute < minutes);

  const target = new Date(now);
  if (!isToday) {
    target.setDate(target.getDate() + 1);
  }

  // Set the time in local timezone by computing offset
  const localNow = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  const utcOffset = now.getTime() - localNow.getTime();

  const localTarget = new Date(target);
  localTarget.setHours(hours, minutes, 0, 0);
  const utcTarget = new Date(localTarget.getTime() + utcOffset);

  return utcTarget.toISOString();
}
