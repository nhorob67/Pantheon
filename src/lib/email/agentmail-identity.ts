import { createAdminClient } from "@/lib/supabase/admin";
import {
  type EmailIdentityRecord,
  getActiveEmailIdentity,
} from "@/lib/email/identity";
import {
  AgentMailRequestError,
  createAgentMailClient,
} from "@/lib/email/providers/agentmail";

function coerceMetadata(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value;
}

export async function ensureAgentMailInboxForIdentity(
  identity: EmailIdentityRecord
): Promise<EmailIdentityRecord> {
  if (identity.provider === "agentmail" && identity.provider_mailbox_id) {
    return identity;
  }

  const client = createAgentMailClient();
  let inbox: Awaited<ReturnType<typeof client.createInbox>>;

  try {
    inbox = await client.createInbox({
      identifier: identity.slug,
      purpose: "transactional",
      metadata: {
        customer_id: identity.customer_id,
        identity_id: identity.id,
        pantheon_address: identity.address,
      },
    });
  } catch (error) {
    if (error instanceof AgentMailRequestError && error.status === 409) {
      const existing = await client.findInboxByIdentifier(identity.slug);
      if (!existing) {
        throw error;
      }
      inbox = existing;
    } else {
      throw error;
    }
  }

  const admin = createAdminClient();
  const nextMetadata = {
    ...coerceMetadata(identity.provider_metadata),
    agentmail: {
      inbox_id: inbox.id,
      identifier: inbox.identifier,
      email_address: inbox.emailAddress,
      linked_at: new Date().toISOString(),
    },
  };

  const { data, error } = await admin
    .from("email_identities")
    .update({
      provider: "agentmail",
      provider_mailbox_id: inbox.id,
      provider_metadata: nextMetadata,
    })
    .eq("id", identity.id)
    .select("*")
    .single();

  if (!error && data) {
    return data as EmailIdentityRecord;
  }

  // Concurrent request may have linked the identity first.
  const fallback = await getActiveEmailIdentity(identity.customer_id);
  if (fallback?.id === identity.id && fallback.provider_mailbox_id) {
    return fallback;
  }

  if (error) {
    throw new Error(error.message);
  }

  throw new Error("Failed to link AgentMail inbox to identity");
}
