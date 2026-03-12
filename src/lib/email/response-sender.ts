import type { SupabaseClient } from "@supabase/supabase-js";
import { createAgentMailClient } from "./providers/agentmail";

interface SendEmailResponseInput {
  customerId: string;
  identityId: string;
  inboundId: string;
  sessionId: string;
  runId: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  inReplyToMessageId: string | null;
  referencesHeader: string | null;
  threadId: string | null;
}

interface SendEmailResponseResult {
  providerMessageId: string | null;
  emailMessageId: string | null;
}

/**
 * Send the AI-generated response back to the user via AgentMail,
 * with proper RFC 822 threading headers.
 */
export async function sendEmailResponse(
  admin: SupabaseClient,
  input: SendEmailResponseInput
): Promise<SendEmailResponseResult> {
  const replySubject = input.subject.startsWith("Re:")
    ? input.subject
    : `Re: ${input.subject}`;

  const headers: Record<string, string> = {};
  if (input.inReplyToMessageId) {
    headers["In-Reply-To"] = input.inReplyToMessageId;
  }
  if (input.referencesHeader) {
    headers["References"] = input.referencesHeader;
  } else if (input.inReplyToMessageId) {
    headers["References"] = input.inReplyToMessageId;
  }

  const agentMail = createAgentMailClient();
  let providerMessageId: string | null = null;
  let emailMessageId: string | null = null;

  const result = await agentMail.sendMessage({
    to: input.toEmail,
    from: input.fromEmail,
    subject: replySubject,
    text: input.bodyText,
    headers,
  });

  providerMessageId =
    typeof result.id === "string"
      ? result.id
      : typeof result.message_id === "string"
        ? result.message_id
        : null;

  emailMessageId =
    typeof result.email_message_id === "string"
      ? result.email_message_id
      : typeof result.messageId === "string"
        ? result.messageId
        : null;

  // Record in email_outbound
  await admin
    .from("email_outbound")
    .insert({
      customer_id: input.customerId,
      identity_id: input.identityId,
      inbound_id: input.inboundId,
      session_id: input.sessionId,
      run_id: input.runId,
      to_email: input.toEmail,
      from_email: input.fromEmail,
      subject: replySubject,
      body_text: input.bodyText,
      provider_message_id: providerMessageId,
      email_message_id: emailMessageId,
      in_reply_to: input.inReplyToMessageId,
      references_header: input.referencesHeader || input.inReplyToMessageId,
      thread_id: input.threadId,
      outbound_type: "response",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: {},
    })
    .then(({ error }) => {
      if (error) console.error("[email-response] Failed to record outbound:", error.message);
    });

  return { providerMessageId, emailMessageId };
}
