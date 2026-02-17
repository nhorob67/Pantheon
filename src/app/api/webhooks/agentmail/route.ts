import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/email/webhook-signature";
import { trackEmailWebhookOutcome } from "@/lib/email/webhook-observability";
import { safeErrorMessage } from "@/lib/security/safe-error";

export const runtime = "nodejs";

type AgentMailEvent = {
  type?: string;
  createdAt?: string;
  created_at?: string;
  data?: unknown;
};

type IdentityMatch = {
  id: string;
  customer_id: string;
  instance_id: string | null;
  address: string;
  slug: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
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

function parseAddressValue(value: unknown): { email: string | null; name: string | null } {
  if (!value) {
    return { email: null, name: null };
  }

  if (typeof value === "string") {
    return parseAddress(value);
  }

  if (Array.isArray(value) && value.length > 0) {
    return parseAddressValue(value[0]);
  }

  const objectValue = asObject(value);
  if (!objectValue) {
    return { email: null, name: null };
  }

  const emailCandidate = objectValue.email || objectValue.address;
  const nameCandidate = objectValue.name || objectValue.display_name;
  const email =
    typeof emailCandidate === "string" && emailCandidate.includes("@")
      ? emailCandidate.toLowerCase()
      : null;
  const name = typeof nameCandidate === "string" ? nameCandidate.trim() : null;
  return { email, name: name || null };
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
      } else {
        const parsed = parseAddressValue(entry);
        pushUnique(parsed.email);
      }
    }
    return results;
  }

  const parsed = parseAddressValue(value);
  pushUnique(parsed.email);
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

function normalizeMessageData(
  payload: AgentMailEvent
): Record<string, unknown> {
  const base = asObject(payload.data) || {};
  const nestedMessage = asObject(base.message);

  if (!nestedMessage) {
    return base;
  }

  return {
    ...base,
    ...nestedMessage,
  };
}

function extractInboxId(message: Record<string, unknown>): string | null {
  const direct =
    message.inbox_id ||
    message.inboxId ||
    message.mailbox_id ||
    message.mailboxId;
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const inbox = asObject(message.inbox);
  if (!inbox) return null;
  const inboxId = inbox.id;
  return typeof inboxId === "string" && inboxId.trim().length > 0
    ? inboxId.trim()
    : null;
}

function extractMessageId(message: Record<string, unknown>): string | null {
  const candidate =
    message.message_id ||
    message.messageId ||
    message.internet_message_id ||
    message.internetMessageId;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return extractHeaderValue(message.headers, "message-id");
}

function extractReceivedAt(
  event: AgentMailEvent,
  message: Record<string, unknown>
): string {
  const candidates = [
    event.createdAt,
    event.created_at,
    typeof message.createdAt === "string" ? message.createdAt : null,
    typeof message.created_at === "string" ? message.created_at : null,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return new Date().toISOString();
}

async function findIdentityByProviderMailboxId(
  providerMailboxId: string
): Promise<IdentityMatch | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("id, customer_id, instance_id, address, slug")
    .eq("provider", "agentmail")
    .eq("provider_mailbox_id", providerMailboxId)
    .eq("is_active", true)
    .maybeSingle();

  return (data as IdentityMatch | null) || null;
}

async function findIdentityByRecipient(recipient: string): Promise<IdentityMatch | null> {
  const admin = createAdminClient();

  const { data: byAddress } = await admin
    .from("email_identities")
    .select("id, customer_id, instance_id, address, slug")
    .eq("address", recipient)
    .eq("is_active", true)
    .maybeSingle();

  if (byAddress) return byAddress as IdentityMatch;

  const localPart = recipient.split("@")[0]?.toLowerCase();
  if (!localPart) return null;

  const { data: bySlug } = await admin
    .from("email_identities")
    .select("id, customer_id, instance_id, address, slug")
    .eq("slug", localPart)
    .eq("is_active", true)
    .maybeSingle();

  return (bySlug as IdentityMatch | null) || null;
}

async function markProcessed(providerEventId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "agentmail")
    .eq("provider_event_id", providerEventId);

  if (error) {
    console.error("email_webhook_mark_processed_failed", {
      provider: "agentmail",
      provider_event_id: providerEventId,
      error: error.message,
    });
  }
}

export async function POST(request: Request) {
  const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
  if (!secret) {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType: "unknown",
      outcome: "webhook_secret_missing",
    });

    return NextResponse.json(
      { error: "AGENTMAIL_WEBHOOK_SECRET is not configured" },
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
      provider: "agentmail",
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

  let event: AgentMailEvent;
  try {
    event = JSON.parse(rawBody) as AgentMailEvent;
  } catch {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType: "unknown",
      outcome: "invalid_json",
      providerEventId: svixId,
    });

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!svixId) {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType: event.type || "unknown",
      outcome: "missing_svix_id",
    });

    return NextResponse.json({ error: "Missing svix-id header" }, { status: 400 });
  }

  const eventType = event.type || "unknown";
  const admin = createAdminClient();
  const { error: webhookInsertError } = await admin
    .from("email_webhook_events")
    .insert({
      provider: "agentmail",
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
      provider: "agentmail",
      eventType,
      outcome: "duplicate_event",
      providerEventId: svixId,
    });

    return NextResponse.json({ received: true, duplicate: true });
  }

  if (webhookInsertError) {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
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

  if (eventType !== "message.received") {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType,
      outcome: "ignored_event_type",
      providerEventId: svixId,
      context: { reason: "unsupported_event_type" },
    });

    return NextResponse.json({ received: true, ignored: true });
  }

  const messageData = normalizeMessageData(event);
  const inboxId = extractInboxId(messageData);
  const originalRecipient = extractOriginalRecipient(messageData.headers);
  const recipients = [
    ...extractRecipients(messageData.to),
    ...extractRecipients(messageData.envelope_to),
    ...extractRecipients(messageData.envelopeTo),
    ...extractRecipients(messageData.rcpt_to),
    ...extractRecipients(messageData.rcptTo),
  ];
  if (originalRecipient) {
    recipients.unshift(originalRecipient);
  }

  const orderedRecipients = Array.from(
    new Set(
      recipients
        .map((value) => value.toLowerCase().trim())
        .filter((value) => value.length > 0)
    )
  );

  let identity = inboxId
    ? await findIdentityByProviderMailboxId(inboxId)
    : null;
  let matchedRecipient: string | null = null;

  if (!identity) {
    for (const recipient of orderedRecipients) {
      const found = await findIdentityByRecipient(recipient);
      if (found) {
        identity = found;
        matchedRecipient = recipient;
        break;
      }
    }
  }

  if (!identity && orderedRecipients.length === 0 && !inboxId) {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType,
      outcome: "ignored_missing_recipient",
      providerEventId: svixId,
    });

    return NextResponse.json({ received: true, ignored: "missing_recipient" });
  }

  if (!identity) {
    await markProcessed(svixId);
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType,
      outcome: "ignored_unknown_recipient",
      providerEventId: svixId,
      context: {
        recipient: orderedRecipients[0] || null,
        provider_mailbox_id: inboxId,
      },
    });

    return NextResponse.json({
      received: true,
      ignored: "unknown_recipient",
      recipient: orderedRecipients[0] || null,
      provider_mailbox_id: inboxId,
    });
  }

  const fromParsed = parseAddressValue(messageData.from);
  const ccRecipients = extractRecipients(messageData.cc);
  const bccRecipients = extractRecipients(messageData.bcc);
  const providerEmailId =
    (typeof messageData.id === "string" && messageData.id) ||
    (typeof messageData.message_id === "string" && messageData.message_id) ||
    (typeof messageData.messageId === "string" && messageData.messageId) ||
    svixId;

  const attachmentCount =
    typeof messageData.attachments_count === "number"
      ? messageData.attachments_count
      : Array.isArray(messageData.attachments)
        ? messageData.attachments.length
        : 0;

  const { error: inboundInsertError } = await admin
    .from("email_inbound")
    .insert({
      customer_id: identity.customer_id,
      instance_id: identity.instance_id,
      identity_id: identity.id,
      provider: "agentmail",
      provider_email_id: providerEmailId,
      provider_event_id: svixId,
      from_email: fromParsed.email,
      from_name: fromParsed.name,
      to_email: identity.address,
      subject:
        typeof messageData.subject === "string" ? messageData.subject : null,
      message_id: extractMessageId(messageData),
      cc: ccRecipients,
      bcc: bccRecipients,
      attachment_count: attachmentCount,
      metadata: {
        agentmail_event_type: eventType,
        agentmail_received_at: extractReceivedAt(event, messageData),
        to: messageData.to || null,
        matched_recipient: matchedRecipient,
        original_recipient: originalRecipient,
        provider_mailbox_id: inboxId,
        message_id: extractHeaderValue(messageData.headers, "message-id"),
        in_reply_to: extractHeaderValue(messageData.headers, "in-reply-to"),
      },
      status: "queued",
      received_at: extractReceivedAt(event, messageData),
    });

  if (inboundInsertError && inboundInsertError.code !== "23505") {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
      eventType,
      outcome: "db_error_inbound",
      providerEventId: svixId,
      context: {
        error: inboundInsertError.message,
        provider_mailbox_id: inboxId,
      },
    });

    return NextResponse.json(
      { error: safeErrorMessage(inboundInsertError, "Failed to store inbound email") },
      { status: 500 }
    );
  }

  if (inboundInsertError?.code === "23505") {
    await trackEmailWebhookOutcome({
      provider: "agentmail",
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
    provider: "agentmail",
    eventType,
    outcome: "queued",
    providerEventId: svixId,
    context: {
      customer_id: identity.customer_id,
      identity_id: identity.id,
      provider_mailbox_id: inboxId,
      attachment_count: attachmentCount,
    },
  });

  return NextResponse.json({ received: true, queued: true });
}
