import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/email/webhook-signature";
import { trackEmailWebhookOutcome } from "@/lib/email/webhook-observability";
import { safeErrorMessage } from "@/lib/security/safe-error";

export const runtime = "nodejs";

function isResendIngressEnabled(): boolean {
  const flag = process.env.EMAIL_RESEND_INGRESS_ENABLED;
  if (!flag) {
    return true;
  }

  const normalized = flag.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

type ResendReceivedEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    id?: string;
    created_at?: string;
    from?: string;
    to?: unknown;
    cc?: unknown;
    bcc?: unknown;
    subject?: string;
    message_id?: string;
    attachments_count?: number;
    headers?: unknown;
  };
};

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

function extractRecipients(value: unknown): string[] {
  if (!value) return [];

  const results: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (email: string | null) => {
    if (!email) return;
    if (seen.has(email)) return;
    seen.add(email);
    results.push(email);
  };

  const normalize = (candidate: string): string | null => {
    const { email } = parseAddress(candidate);
    if (!email || !email.includes("@")) return null;
    return email;
  };

  if (typeof value === "string") {
    for (const part of value.split(",")) {
      pushUnique(normalize(part));
    }
    return results;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        pushUnique(normalize(entry));
      } else if (
        typeof entry === "object" &&
        entry !== null &&
        "email" in entry &&
        typeof (entry as { email: unknown }).email === "string"
      ) {
        pushUnique(normalize((entry as { email: string }).email));
      }
    }
  }

  return results;
}

function extractHeaderValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== "object") return null;

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(
    headers as Record<string, unknown>
  )) {
    if (key.toLowerCase() !== lowerName) continue;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
  }

  return null;
}

function extractOriginalRecipient(headers: unknown): string | null {
  const candidate =
    extractHeaderValue(headers, "x-farmclaw-original-to") ||
    extractHeaderValue(headers, "x-original-to") ||
    extractHeaderValue(headers, "delivered-to");

  if (!candidate) return null;

  const parsed = extractRecipients(candidate);
  return parsed.length > 0 ? parsed[0] : null;
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

async function markProcessed(providerEventId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "resend")
    .eq("provider_event_id", providerEventId);

  if (error) {
    console.error("email_webhook_mark_processed_failed", {
      provider: "resend",
      provider_event_id: providerEventId,
      error: error.message,
    });
  }
}

export async function POST(request: Request) {
  if (!isResendIngressEnabled()) {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType: "unknown",
      outcome: "ignored_event_type",
      context: { reason: "resend_ingress_disabled" },
    });

    return NextResponse.json(
      { error: "Resend ingress disabled" },
      { status: 410 }
    );
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType: "unknown",
      outcome: "webhook_secret_missing",
    });

    return NextResponse.json(
      { error: "RESEND_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  try {
    verifySvixSignature({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      secret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";

    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType: "unknown",
      outcome: "invalid_signature",
      providerEventId: svixId,
      context: { error: message },
    });

    return NextResponse.json(
      { error: `Webhook verification failed: ${message}` },
      { status: 400 }
    );
  }

  let event: ResendReceivedEvent;
  try {
    event = JSON.parse(rawBody) as ResendReceivedEvent;
  } catch {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType: "unknown",
      outcome: "invalid_json",
      providerEventId: svixId,
    });

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!svixId) {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType: event.type || "unknown",
      outcome: "missing_svix_id",
    });

    return NextResponse.json({ error: "Missing svix-id header" }, { status: 400 });
  }

  const admin = createAdminClient();
  const eventType = event.type || "unknown";
  const { error: webhookInsertError } = await admin
    .from("email_webhook_events")
    .insert({
      provider: "resend",
      provider_event_id: svixId,
      event_type: eventType,
      payload: event,
      headers: {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      },
    });

  if (webhookInsertError?.code === "23505") {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "duplicate_event",
      providerEventId: svixId,
    });

    return NextResponse.json({ received: true, duplicate: true });
  }

  if (webhookInsertError) {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "db_error_event",
      providerEventId: svixId,
      context: { error: webhookInsertError.message },
    });

    return NextResponse.json(
      { error: safeErrorMessage(webhookInsertError, "Webhook processing failed") },
      { status: 500 }
    );
  }

  if (eventType !== "email.received") {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "ignored_event_type",
      providerEventId: svixId,
      context: { reason: "unsupported_event_type" },
    });

    return NextResponse.json({ received: true, ignored: true });
  }

  const recipients = extractRecipients(event.data?.to);
  const originalRecipient = extractOriginalRecipient(event.data?.headers);
  const ccRecipients = extractRecipients(event.data?.cc);
  const bccRecipients = extractRecipients(event.data?.bcc);

  if (originalRecipient) {
    recipients.unshift(originalRecipient.toLowerCase());
  }

  const orderedRecipients = Array.from(new Set(recipients));

  let identity: {
    id: string;
    customer_id: string;
    instance_id: string | null;
    address: string;
    slug: string;
  } | null = null;
  let matchedRecipient: string | null = null;

  for (const recipient of orderedRecipients) {
    const found = await findIdentityByRecipient(recipient);
    if (found) {
      identity = found;
      matchedRecipient = recipient;
      break;
    }
  }

  if (orderedRecipients.length === 0) {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "ignored_missing_recipient",
      providerEventId: svixId,
    });

    return NextResponse.json({ received: true, ignored: "missing_recipient" });
  }

  if (!identity) {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "ignored_unknown_recipient",
      providerEventId: svixId,
      context: {
        recipient: orderedRecipients[0],
      },
    });

    return NextResponse.json({
      received: true,
      ignored: "unknown_recipient",
      recipient: orderedRecipients[0],
    });
  }

  const fromRaw = event.data?.from || "";
  const fromParsed = fromRaw ? parseAddress(fromRaw) : { email: null, name: null };
  const providerEmailId = event.data?.email_id || event.data?.id || svixId;
  const attachmentCount =
    typeof event.data?.attachments_count === "number"
      ? event.data.attachments_count
      : 0;

  const { error: inboundInsertError } = await admin
    .from("email_inbound")
    .insert({
      customer_id: identity.customer_id,
      instance_id: identity.instance_id,
      identity_id: identity.id,
      provider: "resend",
      provider_email_id: providerEmailId,
      provider_event_id: svixId,
      from_email: fromParsed.email,
      from_name: fromParsed.name,
      to_email: identity.address,
      subject: event.data?.subject || null,
      message_id: event.data?.message_id || null,
      cc: ccRecipients,
      bcc: bccRecipients,
      attachment_count: attachmentCount,
      metadata: {
        resend_received_at: event.created_at || event.data?.created_at || null,
        to: event.data?.to || null,
        matched_recipient: matchedRecipient,
        original_recipient: originalRecipient,
        cc: ccRecipients,
        bcc: bccRecipients,
        headers: event.data?.headers || {},
      },
      status: "queued",
      received_at: event.created_at || event.data?.created_at || new Date().toISOString(),
    });

  if (inboundInsertError && inboundInsertError.code !== "23505") {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "db_error_inbound",
      providerEventId: svixId,
      context: {
        error: inboundInsertError.message,
        matched_recipient: matchedRecipient,
      },
    });

    return NextResponse.json(
      { error: safeErrorMessage(inboundInsertError, "Failed to store inbound email") },
      { status: 500 }
    );
  }

  if (inboundInsertError?.code === "23505") {
    await trackEmailWebhookOutcome({
      provider: "resend",
      eventType,
      outcome: "duplicate_inbound",
      providerEventId: svixId,
      context: {
        provider_email_id: providerEmailId,
      },
    });
  }

  await markProcessed(svixId);
  await trackEmailWebhookOutcome({
    provider: "resend",
    eventType,
    outcome: "queued",
    providerEventId: svixId,
    context: {
      customer_id: identity.customer_id,
      identity_id: identity.id,
      matched_recipient: matchedRecipient,
      attachment_count: attachmentCount,
    },
  });

  return NextResponse.json({ received: true, queued: true });
}
