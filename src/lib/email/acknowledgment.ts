import type { SupabaseClient } from "@supabase/supabase-js";
import { createAgentMailClient } from "./providers/agentmail";

interface AttachmentSummary {
  filename: string;
  mimeType: string;
}

interface SendAckInput {
  customerId: string;
  identityId: string;
  inboundId: string;
  sessionId: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  inReplyToMessageId: string | null;
  referencesHeader: string | null;
  threadId: string | null;
  attachments: AttachmentSummary[];
}

interface SendAckResult {
  providerMessageId: string | null;
  emailMessageId: string | null;
}

/**
 * Build an acknowledgment message body based on email content and attachments.
 */
function buildAckBody(
  attachments: AttachmentSummary[]
): string {
  if (attachments.length === 0) {
    return "Got your message. Working on a response now.";
  }

  const pdfs = attachments.filter((a) => a.mimeType.includes("pdf"));
  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const docs = attachments.filter(
    (a) =>
      a.mimeType.includes("word") ||
      a.mimeType.includes("openxmlformats-officedocument")
  );

  if (attachments.length === 1) {
    const a = attachments[0];
    if (pdfs.length === 1) {
      return `Got your PDF (${a.filename}). Analyzing the document \u2014 full response in ~2 min.`;
    }
    if (images.length === 1) {
      return `Got your image (${a.filename}). Running image analysis \u2014 response coming shortly.`;
    }
    if (docs.length === 1) {
      return `Got your document (${a.filename}). Reading through it now \u2014 full response in ~2 min.`;
    }
    return `Got your file (${a.filename}). Processing it now \u2014 response coming shortly.`;
  }

  return `Got your ${attachments.length} files. Processing all attachments \u2014 full response in ~2 min.`;
}

/**
 * Send an immediate acknowledgment email via AgentMail before AI processing.
 * Records the outbound email in `email_outbound`.
 */
export async function sendAcknowledgment(
  admin: SupabaseClient,
  input: SendAckInput
): Promise<SendAckResult> {
  const ackBody = buildAckBody(input.attachments);
  const ackSubject = input.subject.startsWith("Re:")
    ? input.subject
    : `Re: ${input.subject}`;

  // Build threading headers
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

  try {
    const result = await agentMail.sendMessage({
      to: input.fromEmail,
      from: input.toEmail,
      subject: ackSubject,
      text: ackBody,
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
  } catch (err) {
    console.error("[ack] Failed to send acknowledgment:", err);
  }

  // Record in email_outbound
  await admin
    .from("email_outbound")
    .insert({
      customer_id: input.customerId,
      identity_id: input.identityId,
      inbound_id: input.inboundId,
      session_id: input.sessionId,
      to_email: input.fromEmail,
      from_email: input.toEmail,
      subject: ackSubject,
      body_text: ackBody,
      provider_message_id: providerMessageId,
      email_message_id: emailMessageId,
      in_reply_to: input.inReplyToMessageId,
      references_header: input.referencesHeader || input.inReplyToMessageId,
      thread_id: input.threadId,
      outbound_type: "acknowledgment",
      status: providerMessageId ? "sent" : "failed",
      sent_at: providerMessageId ? new Date().toISOString() : null,
      metadata: {},
    })
    .then(({ error }) => {
      if (error) console.error("[ack] Failed to record outbound:", error.message);
    });

  return { providerMessageId, emailMessageId };
}
