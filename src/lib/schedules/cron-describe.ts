import cronstrue from "cronstrue";

/**
 * Convert a cron expression to a human-readable description.
 * e.g. "0 7 * * 2" → "At 07:00 AM, only on Tuesday"
 */
export function describeCron(expression: string): string {
  try {
    return cronstrue.toString(expression, { use24HourTimeFormat: false });
  } catch {
    return expression;
  }
}
