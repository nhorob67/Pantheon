/**
 * Sanitization helpers for PostgREST `.ilike()` and `.or()` filter values.
 *
 * PostgREST passes pattern strings directly to Postgres LIKE/ILIKE operators.
 * The `%` and `_` characters are LIKE wildcards; leaving them unescaped allows
 * callers to manipulate query matching (SQL injection-lite). Similarly, commas
 * inside `.or()` filter strings act as disjunction separators and must be
 * escaped to prevent injection of extra filter clauses.
 */

/** Escape `%` and `_` so they match literally in `.ilike()` patterns. */
export function sanitizeLikePattern(raw: string): string {
  return raw.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Escape `%`, `_`, **and** `,` for values embedded inside `.or()` strings.
 * The comma is the PostgREST disjunction separator.
 */
export function sanitizeOrFilterValue(raw: string): string {
  return raw
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,");
}

/**
 * Convenience wrapper for search-box inputs used in `.or()` filters.
 * Trims whitespace, returns `""` for blank input, and escapes all
 * PostgREST-significant characters.
 */
export function sanitizeSearchForOr(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  return sanitizeOrFilterValue(trimmed);
}
