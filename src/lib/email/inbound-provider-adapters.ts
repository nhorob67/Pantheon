import {
  extractResendAttachmentRefs,
  fetchResendAttachmentBinary,
  fetchResendAttachmentList,
  fetchResendReceivedEmail,
  type ResendAttachmentRef,
} from "@/lib/email/resend-receiving";
import { createAgentMailClient } from "@/lib/email/providers/agentmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { simpleParser } from "mailparser";

export interface InboundAttachmentRef {
  id: string | null;
  filename: string;
  content_type: string | null;
  size: number | null;
  content_base64: string | null;
}

interface InboundAttachmentBinary {
  buffer: Buffer;
  contentType: string | null;
}

export interface InboundProviderAdapter {
  provider: string;
  fetchReceivedEmail: (providerEmailId: string) => Promise<Record<string, unknown>>;
  extractAttachmentRefs: (emailPayload: Record<string, unknown>) => InboundAttachmentRef[];
  fetchAttachmentList: (providerEmailId: string) => Promise<InboundAttachmentRef[]>;
  fetchAttachmentBinary: (
    providerEmailId: string,
    attachmentId: string
  ) => Promise<InboundAttachmentBinary>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function toAttachmentRef(value: unknown): InboundAttachmentRef | null {
  const record = asObject(value);
  if (!record) {
    return null;
  }

  const filename =
    toStringValue(record.filename) ||
    toStringValue(record.file_name) ||
    toStringValue(record.name);

  if (!filename) {
    return null;
  }

  const contentBase64 =
    toStringValue(record.content_base64) ||
    toStringValue(record.base64) ||
    toStringValue(record.content) ||
    toStringValue(record.data);

  return {
    id:
      toStringValue(record.id) ||
      toStringValue(record.attachment_id) ||
      toStringValue(record.attachmentId),
    filename,
    content_type:
      toStringValue(record.content_type) ||
      toStringValue(record.mime_type) ||
      toStringValue(record.contentType) ||
      toStringValue(record.type),
    size:
      toNumber(record.size) ||
      toNumber(record.content_length) ||
      toNumber(record.size_bytes),
    content_base64: contentBase64,
  };
}

function asInboundAttachmentRefList(
  values: unknown[],
  fallbackProvider: string
): InboundAttachmentRef[] {
  const items: InboundAttachmentRef[] = [];

  for (const value of values) {
    const ref = toAttachmentRef(value);
    if (ref) {
      items.push(ref);
      continue;
    }

    if (fallbackProvider === "resend") {
      const resendRef = value as ResendAttachmentRef;
      if (resendRef && typeof resendRef.filename === "string") {
        items.push({
          id: resendRef.id,
          filename: resendRef.filename,
          content_type: resendRef.content_type,
          size: resendRef.size,
          content_base64: resendRef.content_base64,
        });
      }
    }
  }

  return items;
}

function extractAgentMailAttachmentRefs(
  emailPayload: Record<string, unknown>
): InboundAttachmentRef[] {
  const direct = Array.isArray(emailPayload.attachments)
    ? emailPayload.attachments
    : [];

  const message = asObject(emailPayload.message);
  const nested = message && Array.isArray(message.attachments)
    ? message.attachments
    : [];

  return asInboundAttachmentRefList([...direct, ...nested], "agentmail");
}

function parseAgentMailAttachmentList(
  payload: Record<string, unknown>
): InboundAttachmentRef[] {
  const candidates: unknown[] = [];
  if (Array.isArray(payload.data)) {
    candidates.push(...payload.data);
  }
  if (Array.isArray(payload.items)) {
    candidates.push(...payload.items);
  }
  if (Array.isArray(payload.attachments)) {
    candidates.push(...payload.attachments);
  }

  const dataObject = asObject(payload.data);
  if (dataObject && Array.isArray(dataObject.attachments)) {
    candidates.push(...dataObject.attachments);
  }

  return asInboundAttachmentRefList(candidates, "agentmail");
}

async function fetchCloudflareWebhookPayload(
  providerEmailId: string
): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_webhook_events")
    .select("payload")
    .eq("provider", "cloudflare")
    .eq("provider_event_id", providerEmailId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Cloudflare email payload: ${error.message}`);
  }

  const payload = asObject((data as { payload?: unknown } | null)?.payload);
  if (!payload) {
    throw new Error(`Cloudflare email payload not found for event ${providerEmailId}`);
  }

  return payload;
}

async function buildCloudflareAttachmentRefs(
  payload: Record<string, unknown>
): Promise<InboundAttachmentRef[]> {
  const data = asObject(payload.data);
  if (!data || typeof data.raw_email !== "string" || data.raw_email.length === 0) {
    return [];
  }

  const parsed = await simpleParser(Buffer.from(data.raw_email, "base64"));
  return parsed.attachments.map((attachment, index) => ({
    id: `cloudflare-${index + 1}`,
    filename: attachment.filename || `attachment-${index + 1}.bin`,
    content_type: attachment.contentType || null,
    size: attachment.size ?? attachment.content.byteLength,
    content_base64: attachment.content.toString("base64"),
  }));
}

const resendAdapter: InboundProviderAdapter = {
  provider: "resend",
  fetchReceivedEmail: fetchResendReceivedEmail,
  extractAttachmentRefs: (emailPayload) =>
    asInboundAttachmentRefList(extractResendAttachmentRefs(emailPayload), "resend"),
  fetchAttachmentList: async (providerEmailId) =>
    asInboundAttachmentRefList(
      await fetchResendAttachmentList(providerEmailId),
      "resend"
    ),
  fetchAttachmentBinary: async (providerEmailId, attachmentId) =>
    fetchResendAttachmentBinary(providerEmailId, attachmentId),
};

const agentMailAdapter: InboundProviderAdapter = {
  provider: "agentmail",
  fetchReceivedEmail: async (providerEmailId) => {
    const client = createAgentMailClient();
    return client.fetchMessage(providerEmailId);
  },
  extractAttachmentRefs: extractAgentMailAttachmentRefs,
  fetchAttachmentList: async (providerEmailId) => {
    const client = createAgentMailClient();
    const payload = await client.fetchMessageAttachments(providerEmailId);
    return parseAgentMailAttachmentList(payload);
  },
  fetchAttachmentBinary: async (providerEmailId, attachmentId) => {
    const client = createAgentMailClient();
    const result = await client.fetchMessageAttachmentBinary(
      providerEmailId,
      attachmentId
    );

    return {
      buffer: result.bytes,
      contentType: result.contentType,
    };
  },
};

const cloudflareAdapter: InboundProviderAdapter = {
  provider: "cloudflare",
  fetchReceivedEmail: async (providerEmailId) => {
    const payload = await fetchCloudflareWebhookPayload(providerEmailId);
    const attachments = await buildCloudflareAttachmentRefs(payload);
    return {
      ...payload,
      cloudflare_attachments: attachments,
    };
  },
  extractAttachmentRefs: (emailPayload) =>
    asInboundAttachmentRefList(
      Array.isArray(emailPayload.cloudflare_attachments)
        ? emailPayload.cloudflare_attachments
        : [],
      "cloudflare"
    ),
  fetchAttachmentList: async (providerEmailId) => {
    const payload = await fetchCloudflareWebhookPayload(providerEmailId);
    return buildCloudflareAttachmentRefs(payload);
  },
  fetchAttachmentBinary: async (providerEmailId, attachmentId) => {
    const payload = await fetchCloudflareWebhookPayload(providerEmailId);
    const attachments = await buildCloudflareAttachmentRefs(payload);
    const attachment = attachments.find((item) => item.id === attachmentId);

    if (!attachment?.content_base64) {
      throw new Error(`Cloudflare attachment ${attachmentId} not found`);
    }

    return {
      buffer: Buffer.from(attachment.content_base64, "base64"),
      contentType: attachment.content_type,
    };
  },
};

export function getInboundProviderAdapter(provider: string): InboundProviderAdapter {
  if (provider === "resend") {
    return resendAdapter;
  }

  if (provider === "agentmail") {
    return agentMailAdapter;
  }

  if (provider === "cloudflare") {
    return cloudflareAdapter;
  }

  throw new Error(`Unsupported inbound provider: ${provider}`);
}
