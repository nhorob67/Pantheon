// ---------------------------------------------------------------------------
// Secret Redaction
//
// Strips secret values from strings that may end up in traces, memory writes,
// conversation logs, or tool result payloads. Used by the http_request tool
// to sanitize responses before they enter the LLM context.
// ---------------------------------------------------------------------------

const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Build a redaction function that replaces known secret values in any string.
 * Call this once per AI worker execution with all decrypted values that were
 * used during the run, then apply to tool results before they reach the model.
 */
export function buildRedactor(secretValues: string[]): (input: string) => string {
  if (secretValues.length === 0) return (s) => s;

  // Sort by length descending so longer secrets are matched first
  // (prevents partial matches on substrings)
  const sorted = [...secretValues].sort((a, b) => b.length - a.length);

  return (input: string): string => {
    let result = input;
    for (const secret of sorted) {
      if (secret.length < 4) continue; // Skip trivially short values
      // Use split+join for safe literal replacement (no regex escaping needed)
      result = result.split(secret).join(REDACTED_PLACEHOLDER);
    }
    return result;
  };
}

/**
 * Redact a single known secret value from a string.
 */
export function redactValue(input: string, secretValue: string): string {
  if (secretValue.length < 4) return input;
  return input.split(secretValue).join(REDACTED_PLACEHOLDER);
}

/**
 * Redact common credential patterns from arbitrary text.
 * Catches patterns like Authorization headers, API keys in URLs, etc.
 * This is a safety net — primary redaction uses known values via buildRedactor.
 */
export function redactCommonPatterns(input: string): string {
  return input
    // Bearer tokens in headers
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g, `Bearer ${REDACTED_PLACEHOLDER}`)
    // Basic auth in headers
    .replace(/Basic\s+[A-Za-z0-9+/=]{8,}/g, `Basic ${REDACTED_PLACEHOLDER}`)
    // API keys in query strings
    .replace(/(api[_-]?key|token|secret|password|apikey)=([^&\s]{8,})/gi, `$1=${REDACTED_PLACEHOLDER}`);
}
