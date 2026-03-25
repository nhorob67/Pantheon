/**
 * Lightweight telemetry for silent catches.
 *
 * Replaces `.catch(() => {})` patterns with structured logging so
 * swallowed errors become visible in Vercel logs without changing
 * control flow.
 */

export function logSilentCatch(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[SILENT_CATCH][${context}]`, message);
}
