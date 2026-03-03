// Security: Stripe signature verification + idempotent event processing are the
// primary controls. Flood/DDoS protection belongs at the edge layer
// (Vercel/Cloudflare WAF), not in-app — serverless rate limiting of
// unauthenticated webhook endpoints adds DB load without meaningful benefit.
import { after, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
} from "@/lib/stripe/webhooks";

const STALE_PROCESSING_WINDOW_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 2000;

type StripeWebhookEventStatus = "processing" | "processed" | "failed";

interface StripeWebhookEventRow {
  status: StripeWebhookEventStatus;
  attempt_count: number;
  last_attempt_at: string | null;
}

function eventPayloadSummary(event: Stripe.Event): Record<string, unknown> {
  return {
    id: event.id,
    type: event.type,
    api_version: event.api_version,
    created: event.created,
    livemode: event.livemode,
    request: event.request,
  };
}

async function claimStripeWebhookEvent(
  event: Stripe.Event
): Promise<"process" | "duplicate"> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const payload = eventPayloadSummary(event);

  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    payload,
    status: "processing",
    attempt_count: 1,
    received_at: nowIso,
    last_attempt_at: nowIso,
    processed_at: null,
    last_error: null,
  });

  if (!insertError) {
    return "process";
  }

  if (insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  const { data: existing, error: selectError } = await admin
    .from("stripe_webhook_events")
    .select("status, attempt_count, last_attempt_at")
    .eq("event_id", event.id)
    .single();

  if (selectError || !existing) {
    throw new Error(selectError?.message || "Failed to load webhook event state");
  }

  const row = existing as StripeWebhookEventRow;
  if (row.status === "processed") {
    return "duplicate";
  }

  if (row.status === "processing" && row.last_attempt_at) {
    const lastAttemptMs = new Date(row.last_attempt_at).getTime();
    if (
      Number.isFinite(lastAttemptMs) &&
      Date.now() - lastAttemptMs <= STALE_PROCESSING_WINDOW_MS
    ) {
      return "duplicate";
    }
  }

  const { error: updateError } = await admin
    .from("stripe_webhook_events")
    .update({
      event_type: event.type,
      payload,
      status: "processing",
      attempt_count: Math.max(row.attempt_count, 0) + 1,
      received_at: nowIso,
      last_attempt_at: nowIso,
      processed_at: null,
      last_error: null,
    })
    .eq("event_id", event.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return "process";
}

async function markStripeWebhookProcessed(eventId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markStripeWebhookFailed(
  eventId: string,
  err: unknown
): Promise<void> {
  const message =
    err instanceof Error ? err.message : "Unknown Stripe webhook processing error";
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      last_error: message.slice(0, MAX_ERROR_LENGTH),
      last_attempt_at: new Date().toISOString(),
      processed_at: null,
    })
    .eq("event_id", eventId);

  if (error) {
    console.error("[STRIPE_WEBHOOK] Failed to persist failed state:", error.message);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  let decision: "process" | "duplicate";
  try {
    decision = await claimStripeWebhookEvent(event);
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Failed to claim webhook event:", err);
    return NextResponse.json(
      { error: "Failed to claim webhook event" },
      { status: 500 }
    );
  }

  if (decision === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    after(async () => {
      try {
        await markStripeWebhookProcessed(event.id);
      } catch (err) {
        console.error("[STRIPE_WEBHOOK] Failed to mark processed:", err);
      }
    });
  } catch (err) {
    await markStripeWebhookFailed(event.id, err);
    console.error("[STRIPE_WEBHOOK] Handler failed:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
