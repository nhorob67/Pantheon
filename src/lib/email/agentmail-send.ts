import type { SupabaseClient } from "@supabase/supabase-js";

interface AgentMailIdentityForSend {
  address: string;
  provider: string | null;
  provider_mailbox_id: string | null;
}

interface AgentMailSendPayloadInput {
  mailboxId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}

export function buildAgentMailSendPayload(
  input: AgentMailSendPayloadInput
): Record<string, unknown> {
  return {
    inbox_id: input.mailboxId,
    from: input.fromEmail,
    to: input.toEmail,
    subject: input.subject,
    text: input.text,
    headers: input.headers || {},
  };
}

export async function loadAgentMailIdentityForSend(
  admin: SupabaseClient,
  identityId: string,
  fromEmail: string
): Promise<AgentMailIdentityForSend> {
  const { data, error } = await admin
    .from("email_identities")
    .select("address, provider, provider_mailbox_id")
    .eq("id", identityId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load email identity for send: ${error?.message || "not found"}`);
  }

  const identity = data as AgentMailIdentityForSend;
  if (identity.provider && identity.provider !== "agentmail") {
    throw new Error(`Unsupported email provider for send: ${identity.provider}`);
  }

  if (!identity.provider_mailbox_id) {
    throw new Error("AgentMail inbox is not provisioned for this identity");
  }

  if (identity.address !== fromEmail) {
    throw new Error("Outbound from address does not match the configured email identity");
  }

  return identity;
}
