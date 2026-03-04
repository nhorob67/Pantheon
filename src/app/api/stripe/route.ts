import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCheckoutSession,
  createEmbeddedCheckoutSession,
  createPortalSession,
} from "@/lib/stripe/client";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";

const createCheckoutSchema = z.object({
  action: z.literal("create-checkout"),
  email: z.string().trim().toLowerCase().email().max(320),
});

const createPortalSchema = z.object({
  action: z.literal("create-portal"),
});

const CHECKOUT_EMAIL_WINDOW_SECONDS = 60 * 60;
const CHECKOUT_EMAIL_MAX_ATTEMPTS = 5;
const CHECKOUT_NETWORK_WINDOW_SECONDS = 10 * 60;
const CHECKOUT_NETWORK_MAX_ATTEMPTS = 20;

function getClientNetworkKey(request: Request): string {
  // Prefer x-real-ip: Vercel sets this to the actual connecting IP (not spoofable).
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

  // Fall back to rightmost x-forwarded-for entry (proxy-appended, not client-controlled).
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    const candidate = parts[parts.length - 1]?.trim();
    if (candidate) return `ip:${candidate}`;
  }

  const userAgent = request.headers.get("user-agent")?.trim();
  if (userAgent) return `ua:${userAgent.toLowerCase()}`;

  return "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body && typeof body === "object" && "action" in body) {
    if ((body as { action?: string }).action === "create-checkout") {
      const parsed = createCheckoutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const emailAllowed = await consumeDurableRateLimit({
        action: "stripe_checkout_email",
        key: parsed.data.email,
        windowSeconds: CHECKOUT_EMAIL_WINDOW_SECONDS,
        maxAttempts: CHECKOUT_EMAIL_MAX_ATTEMPTS,
      }).catch(() => null);

      const networkAllowed = await consumeDurableRateLimit({
        action: "stripe_checkout_network",
        key: getClientNetworkKey(request),
        windowSeconds: CHECKOUT_NETWORK_WINDOW_SECONDS,
        maxAttempts: CHECKOUT_NETWORK_MAX_ATTEMPTS,
      }).catch(() => null);

      if (emailAllowed === null || networkAllowed === null) {
        return NextResponse.json(
          { error: "Rate limiter unavailable. Please try again shortly." },
          { status: 503 }
        );
      }

      if (!emailAllowed || !networkAllowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      // Pre-auth: user is signing up, no session yet
      try {
        const session = await createCheckoutSession(parsed.data.email);
        return NextResponse.json({ url: session.url });
      } catch (err) {
        console.error("[Stripe] Checkout session creation failed:", err);
        return NextResponse.json(
          { error: "Unable to create checkout session. Please try again." },
          { status: 500 }
        );
      }
    }

    if ((body as { action?: string }).action === "create-embedded-checkout") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Guard against duplicate subscriptions
      const adminSupabase = createAdminClient();
      const { data: existing } = await adminSupabase
        .from("customers")
        .select("subscription_status")
        .eq("user_id", user.id)
        .single();

      if (existing?.subscription_status === "active") {
        return NextResponse.json(
          { error: "already_subscribed" },
          { status: 409 }
        );
      }

      try {
        const session = await createEmbeddedCheckoutSession(
          user.email!,
          user.id
        );
        return NextResponse.json({ clientSecret: session.client_secret });
      } catch (err) {
        console.error("[Stripe] Embedded checkout session creation failed:", err);
        return NextResponse.json(
          { error: "Unable to create checkout session. Please try again." },
          { status: 500 }
        );
      }
    }

    if ((body as { action?: string }).action === "create-portal") {
      const parsed = createPortalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Requires auth — resolve Stripe customer ID server-side
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const adminSupabase = createAdminClient();
      const { data: customer } = await adminSupabase
        .from("customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      if (!customer?.stripe_customer_id) {
        return NextResponse.json(
          { error: "No billing account found" },
          { status: 404 }
        );
      }

      const session = await createPortalSession(customer.stripe_customer_id);
      return NextResponse.json({ url: session.url });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
