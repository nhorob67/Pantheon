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
 * Validates that a target URL's origin matches the request origin or the
 * configured NEXT_PUBLIC_APP_URL. Use this for OAuth redirect_url params
 * to prevent open-redirect attacks.
 */
export function validateSameOriginUrl(
  targetUrl: string,
  requestUrl: string
): boolean {
  try {
    const target = new URL(targetUrl);
    const request = new URL(requestUrl);

    if (target.origin === request.origin) {
      return true;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const app = new URL(appUrl);
        if (target.origin === app.origin) {
          return true;
        }
      } catch {
        // Invalid NEXT_PUBLIC_APP_URL — fall through to reject
      }
    }

    return false;
  } catch {
    return false;
  }
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
