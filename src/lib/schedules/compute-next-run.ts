import { CronExpressionParser } from "cron-parser";

/**
 * Compute the next run time for a cron expression in the given timezone.
 * Returns an ISO 8601 timestamp.
 */
export function computeNextRun(
  cron: string,
  timezone: string,
  after?: Date
): string {
  const interval = CronExpressionParser.parse(cron, {
    currentDate: after ?? new Date(),
    tz: timezone,
  });
  const next = interval.next();
  return next.toISOString() ?? new Date().toISOString();
}

/**
 * Compute the next N run times for a cron expression.
 * Useful for UI preview of upcoming executions.
 */
export function computeNextNRuns(
  cron: string,
  timezone: string,
  count: number
): string[] {
  const interval = CronExpressionParser.parse(cron, {
    currentDate: new Date(),
    tz: timezone,
  });
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const iso = interval.next().toISOString();
    if (iso) results.push(iso);
  }
  return results;
}
