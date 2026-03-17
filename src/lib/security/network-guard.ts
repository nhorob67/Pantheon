// ---------------------------------------------------------------------------
// Shared SSRF Protection — extracted for reuse across web-fetch + browser
// ---------------------------------------------------------------------------

export const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

export function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

/**
 * Check whether a URL should be allowed according to domain allow/blocklists.
 * Returns an error message if blocked, or null if allowed.
 */
export function checkDomainPolicy(
  hostname: string,
  allowlist: string[],
  blocklist: string[]
): string | null {
  const lower = hostname.toLowerCase();

  // Blocklist takes precedence
  if (blocklist.length > 0) {
    for (const blocked of blocklist) {
      if (lower === blocked.toLowerCase() || lower.endsWith(`.${blocked.toLowerCase()}`)) {
        return `Domain "${hostname}" is blocked by policy.`;
      }
    }
  }

  // If allowlist is non-empty, only those domains are permitted
  if (allowlist.length > 0) {
    const allowed = allowlist.some((a) => {
      const al = a.toLowerCase();
      return lower === al || lower.endsWith(`.${al}`);
    });
    if (!allowed) {
      return `Domain "${hostname}" is not in the allowed domain list.`;
    }
  }

  return null;
}

/** Patterns that suggest a login/authentication page. */
const AUTH_URL_PATTERNS = [
  /\/login/i,
  /\/signin/i,
  /\/sign-in/i,
  /\/auth\//i,
  /\/oauth/i,
  /\/sso\//i,
  /accounts\.google\.com/i,
  /login\.microsoftonline\.com/i,
];

/** Check if a URL appears to be an authentication page. */
export function isAuthUrl(url: string): boolean {
  return AUTH_URL_PATTERNS.some((p) => p.test(url));
}

/** Field labels that suggest sensitive input (passwords, payment). */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /credit.?card/i,
  /card.?number/i,
  /cvv/i,
  /cvc/i,
  /expir/i,
  /ssn/i,
  /social.?security/i,
  /routing.?number/i,
  /account.?number/i,
];

/** Check if a field label suggests sensitive data input. */
export function isSensitiveField(fieldDescription: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((p) => p.test(fieldDescription));
}
