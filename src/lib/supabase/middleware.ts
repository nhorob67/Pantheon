import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { validateCsrfOrigin } from "@/lib/security/csrf";

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
  ].join("; ");
}

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function updateSession(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCspHeader(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let supabaseResponse = withCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = withCsp(
            NextResponse.next({ request: { headers: requestHeaders } }),
            csp
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isWebhookRoute = pathname.startsWith("/api/webhooks/");
  const isStripeRoute = pathname === "/api/stripe";
  const isProcessInbound = pathname === "/api/admin/email/process-inbound";
  const isBootKeyRoute = pathname === "/api/instances/boot-key";
  const isProtectedApiRoute =
    isApiRoute &&
    !isWebhookRoute &&
    !isStripeRoute &&
    !isProcessInbound &&
    !isBootKeyRoute;

  // CSRF protection for mutating API calls
  const method = request.method;
  if (
    isApiRoute &&
    !isWebhookRoute &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(method)
  ) {
    const csrfError = validateCsrfOrigin(request);
    if (csrfError) {
      return withCsp(
        NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        ),
        csp
      );
    }
  }

  // Defense-in-depth: require auth for all non-webhook API routes
  if (isProtectedApiRoute && !user) {
    return withCsp(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      csp
    );
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isDashboardPage =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/onboarding") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/usage");
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");

  if (!user && isDashboardPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCsp(NextResponse.redirect(url), csp);
  }

  if (!user && isAdminPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCsp(NextResponse.redirect(url), csp);
  }

  if (user && isAdminPage && !isAdmin(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withCsp(NextResponse.redirect(url), csp);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withCsp(NextResponse.redirect(url), csp);
  }

  return supabaseResponse;
}
