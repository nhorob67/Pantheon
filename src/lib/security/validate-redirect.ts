/**
 * Validates and sanitizes a redirect path to prevent open redirects.
 * Strips protocol-relative URLs and ensures the path stays on-origin.
 */
export function safeRedirectPath(
  rawPath: string | null | undefined,
  defaultPath = "/dashboard"
): string {
  if (!rawPath) return defaultPath;

  const path = rawPath.trim();

  // Block protocol-relative URLs (//evil.com)
  if (path.startsWith("//")) return defaultPath;

  // Block absolute URLs with protocols (https://evil.com, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return defaultPath;

  // Must start with a single slash (relative path)
  if (!path.startsWith("/")) return defaultPath;

  return path;
}

/**
 * Validates that a URL points to a legitimate Stripe domain.
 */
export function isValidStripeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "checkout.stripe.com" ||
        parsed.hostname === "billing.stripe.com")
    );
  } catch {
    return false;
  }
}
