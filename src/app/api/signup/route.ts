import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CONFIG } from "@/lib/stripe/config";
import { encrypt } from "@/lib/crypto";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { completePendingSignup } from "@/lib/stripe/complete-pending-signup";

const createSubscriptionSchema = z.object({
  action: z.literal("create-subscription"),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
});

const checkStatusSchema = z.object({
  action: z.literal("check-status"),
  subscriptionId: z.string().min(1),
});

const completeSignupSchema = z.object({
  action: z.literal("complete-signup"),
  subscriptionId: z.string().min(1),
  email: z.string().trim().toLowerCase().email().max(320),
});

const SIGNUP_EMAIL_WINDOW_SECONDS = 60 * 60;
const SIGNUP_EMAIL_MAX_ATTEMPTS = 5;
const SIGNUP_NETWORK_WINDOW_SECONDS = 10 * 60;
const SIGNUP_NETWORK_MAX_ATTEMPTS = 20;

function getClientNetworkKey(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

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

  const action = (body as { action?: string })?.action;

  if (action === "create-subscription") {
    return handleCreateSubscription(body, request);
  }

  if (action === "check-status") {
    return handleCheckStatus(body);
  }

  if (action === "complete-signup") {
    return handleCompleteSignup(body);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function handleCreateSubscription(body: unknown, request: Request) {
  try {
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // Rate limit by email + IP
  const emailAllowed = await consumeDurableRateLimit({
    action: "signup_email",
    key: email,
    windowSeconds: SIGNUP_EMAIL_WINDOW_SECONDS,
    maxAttempts: SIGNUP_EMAIL_MAX_ATTEMPTS,
  }).catch(() => null);

  const networkAllowed = await consumeDurableRateLimit({
    action: "signup_network",
    key: getClientNetworkKey(request),
    windowSeconds: SIGNUP_NETWORK_WINDOW_SECONDS,
    maxAttempts: SIGNUP_NETWORK_MAX_ATTEMPTS,
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

  const admin = createAdminClient();

  // Check for existing customer
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("email", email)
    .single();

  if (existingCustomer) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    );
  }

  // Check for existing auth user
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const existingUser = authUsers?.users?.find((u) => u.email === email);
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    );
  }

  // Encrypt password and upsert pending signup
  const passwordEncrypted = encrypt(password);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Partial unique index can't be used with ON CONFLICT, so do select + insert/update
  const { data: existing } = await admin
    .from("pending_signups")
    .select("id")
    .eq("email", email)
    .in("status", ["pending", "payment_processing"])
    .maybeSingle();

  const upsertResult = existing
    ? await admin
        .from("pending_signups")
        .update({
          password_encrypted: passwordEncrypted,
          status: "pending",
          expires_at: expiresAt,
          updated_at: now,
        })
        .eq("id", existing.id)
    : await admin
        .from("pending_signups")
        .insert({
          email,
          password_encrypted: passwordEncrypted,
          status: "pending",
          expires_at: expiresAt,
          updated_at: now,
        });

  if (upsertResult.error) {
    console.error("[SIGNUP] Failed to upsert pending signup:", upsertResult.error);
    return NextResponse.json(
      { error: "Unable to process signup. Please try again." },
      { status: 500 }
    );
  }

  // Create Stripe customer
  const stripe = getStripe();
  let stripeCustomer;
  try {
    stripeCustomer = await stripe.customers.create({ email });
  } catch (err) {
    console.error("[SIGNUP] Stripe customer creation failed:", err);
    return NextResponse.json(
      { error: "Unable to set up billing. Please try again." },
      { status: 500 }
    );
  }

  // Create subscription with payment_behavior: default_incomplete
  let subscription;
  try {
    subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        { price: STRIPE_CONFIG.priceId },
        { price: STRIPE_CONFIG.meteredPriceId },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });
  } catch (err) {
    console.error("[SIGNUP] Stripe subscription creation failed:", err);
    return NextResponse.json(
      { error: "Unable to set up subscription. Please try again." },
      { status: 500 }
    );
  }

  // Update pending signup with Stripe IDs
  await admin
    .from("pending_signups")
    .update({
      stripe_customer_id: stripeCustomer.id,
      stripe_subscription_id: subscription.id,
      status: "payment_processing",
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .in("status", ["pending", "payment_processing"]);

  // Extract client secret from the expanded PaymentIntent
  // Stripe SDK v20 changed the Invoice shape; payment_intent is on the expanded object
  const invoice = subscription.latest_invoice as unknown as Record<string, unknown>;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
  });
  } catch (err) {
    console.error("[SIGNUP] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleCheckStatus(body: unknown) {
  const parsed = checkStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: signup } = await admin
    .from("pending_signups")
    .select("status, expires_at")
    .eq("stripe_subscription_id", parsed.data.subscriptionId)
    .single();

  if (!signup) {
    return NextResponse.json({ status: "processing" });
  }

  if (signup.status === "completed") {
    return NextResponse.json({ status: "complete" });
  }

  if (
    signup.status === "expired" ||
    new Date(signup.expires_at) < new Date()
  ) {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({ status: "processing" });
}

const COMPLETE_SIGNUP_WINDOW_SECONDS = 5 * 60;
const COMPLETE_SIGNUP_MAX_ATTEMPTS = 10;

async function handleCompleteSignup(body: unknown) {
  const parsed = completeSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { subscriptionId, email } = parsed.data;

  // Rate limit by email
  const allowed = await consumeDurableRateLimit({
    action: "complete_signup",
    key: email,
    windowSeconds: COMPLETE_SIGNUP_WINDOW_SECONDS,
    maxAttempts: COMPLETE_SIGNUP_MAX_ATTEMPTS,
  }).catch(() => null);

  if (allowed === null) {
    return NextResponse.json(
      { error: "Rate limiter unavailable" },
      { status: 503 }
    );
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  const { data: signup } = await admin
    .from("pending_signups")
    .select("id, email, password_encrypted, stripe_subscription_id, status")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!signup) {
    return NextResponse.json({ status: "processing" });
  }

  if (signup.status === "completed") {
    return NextResponse.json({ status: "complete" });
  }

  // Verify the email matches the stored signup (prevents hijacking)
  if (signup.email !== email) {
    return NextResponse.json({ status: "processing" });
  }

  // Verify payment succeeded by checking subscription status with Stripe
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      // Payment hasn't completed yet — tell client to keep waiting
      return NextResponse.json({ status: "processing" });
    }

    // Payment verified — complete the signup synchronously
    await completePendingSignup(signup);
    return NextResponse.json({ status: "complete" });
  } catch (err) {
    console.error("[SIGNUP] complete-signup error:", err);
    return NextResponse.json({ status: "processing" });
  }
}

// Import Stripe types for inline use
import type Stripe from "stripe";
