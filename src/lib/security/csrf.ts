/**
 * CSRF origin validation for mutating API requests.
 * Checks the Origin header against the configured app URL.
 */
export function validateCsrfOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  const cookie = request.headers.get("cookie");

  // Allow non-browser clients (no Origin AND no cookie — e.g. webhooks, cron)
  if (!origin && !cookie) {
    return null;
  }

  // If there's a cookie but no Origin, block it (browser should always send Origin on mutations)
  if (!origin) {
    return "Missing Origin header";
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[CSRF] NEXT_PUBLIC_APP_URL is not configured");
    return "Server misconfiguration";
  }

  const allowedOrigin = new URL(appUrl).origin;
  if (origin !== allowedOrigin) {
    return "Origin mismatch";
  }

  return null;
}
