import {
  extractResendAttachmentRefs,
  fetchResendAttachmentBinary,
  fetchResendAttachmentList,
  fetchResendReceivedEmail,
  type ResendAttachmentRef,
} from "@/lib/email/resend-receiving";
import { createAgentMailClient } from "@/lib/email/providers/agentmail";

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

export function getInboundProviderAdapter(provider: string): InboundProviderAdapter {
  if (provider === "resend") {
    return resendAdapter;
  }

  if (provider === "agentmail") {
    return agentMailAdapter;
  }

  throw new Error(`Unsupported inbound provider: ${provider}`);
}
