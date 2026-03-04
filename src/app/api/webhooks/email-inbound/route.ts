import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEmailWebhookOutcome } from "@/lib/email/webhook-observability";
import { safeErrorMessage } from "@/lib/security/safe-error";

export const runtime = "nodejs";

interface InboundEmailEvent {
  event_id: string;
  type: string;
  timestamp: string;
  data: {
    to: string;
    from: string;
    local_part: string;
    subject: string | null;
    message_id: string | null;
    headers: Record<string, string>;
    raw_email: string;
  };
}

function verifySignature(
  payload: string,
  eventId: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  const signedPayload = `${eventId}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("base64");

  // Extract base64 from "v1,<base64>"
  const parts = signature.split(",");
  if (parts.length !== 2 || parts[0] !== "v1") return false;
  const candidate = parts[1];

  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(candidate, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function parseAddress(value: string): { email: string | null; name: string | null } {
  const trimmed = value.trim();
  const angled = trimmed.match(/^(.*)<([^>]+)>$/);
  if (angled) {
    const name = angled[1].replace(/^"|"$/g, "").trim() || null;
    const email = angled[2].trim().toLowerCase();
    return { email, name };
  }
  return { email: trimmed.toLowerCase(), name: null };
}

async function findIdentityByRecipient(recipient: string) {
  const admin = createAdminClient();

  const { data: byAddress } = await admin
    .from("email_identities")
    .select("id, customer_id, instance_id, address, slug")
    .eq("address", recipient)
    .eq("is_active", true)
    .maybeSingle();

  if (byAddress) return byAddress;

  const localPart = recipient.split("@")[0]?.toLowerCase();
  if (!localPart) return null;

  const { data: bySlug } = await admin
    .from("email_identities")
    .select("id, customer_id, instance_id, address, slug")
    .eq("slug", localPart)
    .eq("is_active", true)
    .maybeSingle();

  return bySlug || null;
}

export async function POST(request: Request) {
  const provider = "cloudflare";
  const secret = process.env.CF_EMAIL_WEBHOOK_SECRET;

  if (!secret) {
    await trackEmailWebhookOutcome({
      provider,
      eventType: "unknown",
      outcome: "webhook_secret_missing",
    });
    return NextResponse.json(
      { error: "CF_EMAIL_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-farmclaw-signature");
  const eventId = request.headers.get("x-farmclaw-event-id");
  const timestamp = request.headers.get("x-farmclaw-timestamp");

  if (!signature || !eventId || !timestamp) {
    await trackEmailWebhookOutcome({
      provider,
      eventType: "unknown",
      outcome: "invalid_signature",
      context: { error: "Missing signature headers" },
    });
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 400 }
    );
  }

  // Reject events older than 5 minutes
  const sentAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > 300) {
    await trackEmailWebhookOutcome({
      provider,
      eventType: "unknown",
      outcome: "invalid_signature",
      providerEventId: eventId,
      context: { error: "Timestamp outside tolerance" },
    });
    return NextResponse.json(
      { error: "Webhook timestamp outside allowed tolerance" },
      { status: 400 }
    );
  }

  if (!verifySignature(rawBody, eventId, timestamp, signature, secret)) {
    await trackEmailWebhookOutcome({
      provider,
      eventType: "unknown",
      outcome: "invalid_signature",
      providerEventId: eventId,
    });
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let event: InboundEmailEvent;
  try {
    event = JSON.parse(rawBody) as InboundEmailEvent;
  } catch {
    await trackEmailWebhookOutcome({
      provider,
      eventType: "unknown",
      outcome: "invalid_json",
      providerEventId: eventId,
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const eventType = event.type || "unknown";

  // Idempotent event insert
  const { error: webhookInsertError } = await admin
    .from("email_webhook_events")
    .insert({
      provider,
      provider_event_id: eventId,
      event_type: eventType,
      payload: event,
      headers: {
        "x-farmclaw-signature": signature,
        "x-farmclaw-event-id": eventId,
        "x-farmclaw-timestamp": timestamp,
      },
    });

  if (webhookInsertError?.code === "23505") {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "duplicate_event",
      providerEventId: eventId,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (webhookInsertError) {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "db_error_event",
      providerEventId: eventId,
      context: { error: webhookInsertError.message },
    });
    return NextResponse.json(
      { error: safeErrorMessage(webhookInsertError, "Webhook processing failed") },
      { status: 500 }
    );
  }

  if (eventType !== "email.received") {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "ignored_event_type",
      providerEventId: eventId,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data } = event;
  const recipient = data.to;

  const identity = await findIdentityByRecipient(recipient);

  if (!identity) {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "ignored_unknown_recipient",
      providerEventId: eventId,
      context: { recipient },
    });
    return NextResponse.json({
      received: true,
      ignored: "unknown_recipient",
      recipient,
    });
  }

  const fromParsed = data.from ? parseAddress(data.from) : { email: null, name: null };

  const { error: inboundInsertError } = await admin
    .from("email_inbound")
    .insert({
      customer_id: identity.customer_id,
      instance_id: identity.instance_id,
      identity_id: identity.id,
      provider,
      provider_email_id: eventId,
      provider_event_id: eventId,
      from_email: fromParsed.email,
      from_name: fromParsed.name,
      to_email: identity.address,
      subject: data.subject,
      message_id: data.message_id,
      cc: [],
      bcc: [],
      attachment_count: 0,
      metadata: {
        local_part: data.local_part,
        headers: data.headers,
        has_raw_email: true,
      },
      status: "queued",
      received_at: new Date(Number(event.timestamp) * 1000).toISOString(),
    });

  if (inboundInsertError && inboundInsertError.code !== "23505") {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "db_error_inbound",
      providerEventId: eventId,
      context: { error: inboundInsertError.message, recipient },
    });
    return NextResponse.json(
      { error: safeErrorMessage(inboundInsertError, "Failed to store inbound email") },
      { status: 500 }
    );
  }

  if (inboundInsertError?.code === "23505") {
    await trackEmailWebhookOutcome({
      provider,
      eventType,
      outcome: "duplicate_inbound",
      providerEventId: eventId,
    });
  }

  await trackEmailWebhookOutcome({
    provider,
    eventType,
    outcome: "queued",
    providerEventId: eventId,
    context: {
      customer_id: identity.customer_id,
      identity_id: identity.id,
      recipient,
    },
  });

  return NextResponse.json({ received: true, queued: true });
}
