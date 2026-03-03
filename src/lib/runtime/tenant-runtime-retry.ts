const RETRY_BASE_DELAY_SECONDS = 15;
const RETRY_MAX_DELAY_SECONDS = 300;

export function computeTenantRuntimeRetryDelaySeconds(attemptCount: number): number {
  const normalizedAttempt = Math.max(1, Math.floor(attemptCount));
  const exponent = Math.max(0, normalizedAttempt - 1);
  const delay = RETRY_BASE_DELAY_SECONDS * (2 ** exponent);
  return Math.min(RETRY_MAX_DELAY_SECONDS, delay);
}
