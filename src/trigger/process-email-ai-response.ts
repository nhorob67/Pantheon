import { randomUUID } from "node:crypto";
import { schedules, tasks } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import {
  extractThreadingHeaders,
  resolveThreadId,
  resolveEmailSession,
} from "@/lib/email/thread-resolver";
import { extractEmailBody } from "@/lib/email/body-extractor";
import { extractAttachmentContents } from "@/lib/email/attachment-content-extractor";
import { sendAcknowledgment } from "@/lib/email/acknowledgment";
import { storeInboundMessage } from "@/lib/ai/message-store";
import { enqueueEmailRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { resolveDefaultAgent } from "@/lib/ai/agent-resolver";

const BATCH_SIZE = 5;

interface EmailInboundRow {
  id: string;
  customer_id: string;
  provider: string;
  provider_email_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  attachment_count: number;
  raw_storage_bucket: string | null;
  raw_storage_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface EmailIdentityRow {
  id: string;
  customer_id: string;
  tenant_id: string | null;
  email_address: string;
}

export const processEmailAiResponse = schedules.task({
  id: "process-email-ai-response",
  cron: "*/1 * * * *",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async () => {
    const admin = createTriggerAdminClient();

    // Claim processed emails ready for AI
    const { data: claimedData, error: claimError } = await admin.rpc(
      "claim_email_ai_jobs",
      { p_limit: BATCH_SIZE }
    );

    if (claimError) {
      throw new Error(`Failed to claim email AI jobs: ${claimError.message}`);
    }

    const claimed = (claimedData || []) as Array<{ id: string }>;
    if (claimed.length === 0) {
      return { claimed: 0, processed: 0, failed: 0 };
    }

    const inboundIds = claimed.map((item) => item.id);
    const { data: inboundRows, error: selectError } = await admin
      .from("email_inbound")
      .select(
        "id, customer_id, provider, provider_email_id, from_email, to_email, subject, attachment_count, raw_storage_bucket, raw_storage_path, metadata"
      )
      .in("id", inboundIds)
      .order("received_at", { ascending: true });

    if (selectError) {
      throw new Error(`Failed to load inbound emails: ${selectError.message}`);
    }

    const rows = (inboundRows || []) as EmailInboundRow[];
    let processedCount = 0;
    let failedCount = 0;

    for (const inbound of rows) {
      try {
        await processOneEmail(admin, inbound);
        processedCount++;
      } catch (err) {
        console.error(
          `[email-ai] Failed to process email ${inbound.id}:`,
          err instanceof Error ? err.message : err
        );
        await admin
          .from("email_inbound")
          .update({
            status: "ai_failed",
            last_error: err instanceof Error ? err.message.slice(0, 2000) : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", inbound.id);
        failedCount++;
      }
    }

    return { claimed: rows.length, processed: processedCount, failed: failedCount };
  },
});

async function processOneEmail(
  admin: ReturnType<typeof createTriggerAdminClient>,
  inbound: EmailInboundRow
): Promise<void> {
  // 1. Resolve email identity and tenant
  const { data: identity } = await admin
    .from("email_identities")
    .select("id, customer_id, tenant_id, email_address")
    .eq("customer_id", inbound.customer_id)
    .limit(1)
    .maybeSingle();

  if (!identity) {
    throw new Error("No email identity found for customer");
  }

  const emailIdentity = identity as EmailIdentityRow;
  let resolvedTenantId = emailIdentity.tenant_id;

  if (!resolvedTenantId) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("customer_id", inbound.customer_id)
      .eq("status", "active")
      .maybeSingle();
    if (!tenant) {
      throw new Error("No active tenant found for customer");
    }
    resolvedTenantId = tenant.id;
  }

  const tenantId: string = resolvedTenantId!;

  // 2. Extract threading headers and resolve thread ID
  const headers = extractThreadingHeaders(inbound.metadata);
  const threadId = resolveThreadId(headers) || `email:${inbound.id}`;

  // 3. Update email_inbound with threading info
  await admin
    .from("email_inbound")
    .update({
      in_reply_to: headers.inReplyTo,
      references_header: headers.references,
      thread_id: threadId,
    })
    .eq("id", inbound.id);

  // 4. Resolve agent (default agent for email)
  const agent = await resolveDefaultAgent(admin, tenantId);

  // 5. Send acknowledgment email (fast, <500ms via AgentMail)
  const ackAttachments: Array<{ filename: string; mimeType: string }> = [];
  if (inbound.attachment_count > 0) {
    const { data: attRows } = await admin
      .from("email_inbound_attachments")
      .select("filename, mime_type")
      .eq("inbound_id", inbound.id);
    if (attRows) {
      for (const row of attRows) {
        ackAttachments.push({
          filename: row.filename || "attachment",
          mimeType: row.mime_type || "application/octet-stream",
        });
      }
    }
  }

  // 6. Resolve email session
  const session = await resolveEmailSession(admin, {
    tenantId,
    customerId: inbound.customer_id,
    agentId: agent?.id ?? null,
    threadId,
    subject: inbound.subject,
    fromEmail: inbound.from_email,
  });

  // Update email_inbound with session reference
  await admin
    .from("email_inbound")
    .update({ session_id: session.id })
    .eq("id", inbound.id);

  // Send ack (after session resolution so we can link it)
  const ackResult = await sendAcknowledgment(admin, {
    customerId: inbound.customer_id,
    identityId: emailIdentity.id,
    inboundId: inbound.id,
    sessionId: session.id,
    fromEmail: inbound.from_email,
    toEmail: inbound.to_email || emailIdentity.email_address,
    subject: inbound.subject || "(no subject)",
    inReplyToMessageId: headers.messageId,
    referencesHeader: headers.references
      ? `${headers.references} ${headers.messageId || ""}`
      : headers.messageId,
    threadId,
    attachments: ackAttachments,
  });

  // Record ack message ID
  if (ackResult.providerMessageId) {
    await admin
      .from("email_inbound")
      .update({ ack_message_id: ackResult.providerMessageId })
      .eq("id", inbound.id);
  }

  // 7. Extract email body text
  let bodyText = "";
  if (inbound.raw_storage_path) {
    bodyText = await extractEmailBody(admin, inbound.raw_storage_path);
  }

  // 8. Extract attachment contents
  const attachments = await extractAttachmentContents(admin, inbound.id);

  // 9. Store inbound message to tenant_messages
  await storeInboundMessage(admin, {
    tenantId,
    customerId: inbound.customer_id,
    sessionId: session.id,
    discordUserId: inbound.from_email,
    content: bodyText || "(email with attachments only)",
    sourceEventId: inbound.id,
  });

  // 10. Build combined user content
  let combinedContent = bodyText;
  for (const att of attachments) {
    if (att.type === "document" && att.parsedText) {
      combinedContent += `\n\n## Attachment: ${att.filename}\n${att.parsedText}`;
    }
  }

  // 11. Enqueue email_runtime run
  const imageUrls = attachments
    .filter((a) => a.type === "image" && a.imageUrl)
    .map((a) => a.imageUrl!);

  const run = await enqueueEmailRuntimeRun(admin, {
    tenantId,
    customerId: inbound.customer_id,
    requestTraceId: `email:${inbound.id}`,
    idempotencyKey: `email:${inbound.id}:${randomUUID().slice(0, 8)}`,
    payload: {
      inbound_id: inbound.id,
      identity_id: emailIdentity.id,
      from_email: inbound.from_email,
      to_email: inbound.to_email || emailIdentity.email_address,
      subject: inbound.subject,
      content: combinedContent,
      thread_id: threadId,
      session_id: session.id,
      in_reply_to: headers.messageId,
      references_header: headers.references
        ? `${headers.references} ${headers.messageId || ""}`
        : headers.messageId,
      image_urls: imageUrls,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        type: a.type,
        parsedText: a.parsedText,
        imageUrl: a.imageUrl,
        sizeBytes: a.sizeBytes,
      })),
    },
  });

  // 12. Trigger process-runtime-run
  await tasks.trigger("process-runtime-run", { runId: run.id });
}
