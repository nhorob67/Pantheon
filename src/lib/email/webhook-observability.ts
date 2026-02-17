import { createAdminClient } from "@/lib/supabase/admin";

export type EmailWebhookOutcome =
  | "webhook_secret_missing"
  | "invalid_signature"
  | "invalid_json"
  | "missing_svix_id"
  | "duplicate_event"
  | "db_error_event"
  | "ignored_event_type"
  | "ignored_missing_recipient"
  | "ignored_unknown_recipient"
  | "db_error_inbound"
  | "duplicate_inbound"
  | "queued";

interface TrackEmailWebhookOutcomeInput {
  provider: string;
  eventType?: string | null;
  outcome: EmailWebhookOutcome;
  providerEventId?: string | null;
  context?: Record<string, unknown>;
}

function normalizeEventType(value?: string | null): string {
  const normalized = String(value || "unknown").trim().toLowerCase();
  return normalized.length > 0 ? normalized : "unknown";
}

function logOutcome(payload: {
  provider: string;
  event_type: string;
  outcome: EmailWebhookOutcome;
  provider_event_id: string | null;
  context?: Record<string, unknown>;
}) {
  const isError =
    payload.outcome === "webhook_secret_missing" ||
    payload.outcome === "invalid_signature" ||
    payload.outcome === "invalid_json" ||
    payload.outcome === "missing_svix_id" ||
    payload.outcome === "db_error_event" ||
    payload.outcome === "db_error_inbound";

  if (isError) {
    console.error("email_webhook_outcome", payload);
    return;
  }

  console.info("email_webhook_outcome", payload);
}

export async function trackEmailWebhookOutcome(
  input: TrackEmailWebhookOutcomeInput
): Promise<void> {
  const eventType = normalizeEventType(input.eventType);
  const payload = {
    provider: input.provider,
    event_type: eventType,
    outcome: input.outcome,
    provider_event_id: input.providerEventId || null,
    context: input.context,
  };

  logOutcome(payload);

  const admin = createAdminClient();
  const { error } = await admin.rpc("increment_email_webhook_counter", {
    p_provider: input.provider,
    p_event_type: eventType,
    p_outcome: input.outcome,
  });

  if (error) {
    console.error("email_webhook_counter_increment_failed", {
      provider: input.provider,
      event_type: eventType,
      outcome: input.outcome,
      provider_event_id: input.providerEventId || null,
      error: error.message,
    });
  }
}
