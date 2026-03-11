const DEFAULT_RESEND_API_BASE_URL = "https://api.resend.com";

export interface ResendAttachmentRef {
  id: string | null;
  filename: string;
  content_type: string | null;
  size: number | null;
  content_base64: string | null;
}

function getResendApiBaseUrl(): string {
  return (
    process.env.RESEND_API_BASE_URL || DEFAULT_RESEND_API_BASE_URL
  ).replace(/\/+$/, "");
}

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return apiKey;
}

async function resendRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${getResendApiBaseUrl()}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getResendApiKey()}`);
  headers.set("User-Agent", "pantheon-email-processor/1.0");

  const response = await fetch(url, {
    ...init,
    headers,
  });

  return response;
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object"
  ) {
    return payload.data as Record<string, unknown>;
  }

  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>;
  }

  throw new Error("Unexpected Resend payload shape");
}

async function parseResendJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const bodyText = (await response.text()).slice(0, 500);
    throw new Error(
      `Unexpected Resend response content-type (${contentType || "none"}): ${bodyText}`
    );
  }

  return response.json();
}

function errorFromFailedResponse(
  status: number,
  payload: unknown,
  fallbackMessage: string
): Error {
  if (payload && typeof payload === "object") {
    const message =
      ("message" in payload && typeof payload.message === "string"
        ? payload.message
        : null) ||
      ("error" in payload && typeof payload.error === "string"
        ? payload.error
        : null);

    if (message) {
      return new Error(`Resend API ${status}: ${message}`);
    }
  }

  return new Error(`${fallbackMessage} (status ${status})`);
}

export async function fetchResendReceivedEmail(
  emailId: string
): Promise<Record<string, unknown>> {
  const response = await resendRequest(`/emails/${encodeURIComponent(emailId)}`);
  const payload = await parseResendJsonResponse(response);

  if (!response.ok) {
    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound email from Resend"
    );
  }

  return unwrapPayload(payload);
}

function asAttachmentRef(value: unknown): ResendAttachmentRef | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const filename =
    (typeof record.filename === "string" && record.filename) ||
    (typeof record.name === "string" && record.name) ||
    null;

  if (!filename) {
    return null;
  }

  const attachmentId =
    (typeof record.id === "string" && record.id) ||
    (typeof record.attachment_id === "string" && record.attachment_id) ||
    null;
  const mimeType =
    (typeof record.content_type === "string" && record.content_type) ||
    (typeof record.mime_type === "string" && record.mime_type) ||
    (typeof record.contentType === "string" && record.contentType) ||
    null;
  const size =
    typeof record.size === "number"
      ? record.size
      : typeof record.content_length === "number"
        ? record.content_length
        : null;
  const contentBase64 =
    (typeof record.content === "string" && record.content) ||
    (typeof record.base64 === "string" && record.base64) ||
    null;

  return {
    id: attachmentId,
    filename,
    content_type: mimeType,
    size,
    content_base64: contentBase64,
  };
}

export function extractResendAttachmentRefs(
  emailPayload: Record<string, unknown>
): ResendAttachmentRef[] {
  const rawAttachments = emailPayload.attachments;
  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  const refs: ResendAttachmentRef[] = [];
  for (const rawAttachment of rawAttachments) {
    const attachment = asAttachmentRef(rawAttachment);
    if (attachment) {
      refs.push(attachment);
    }
  }

  return refs;
}

export async function fetchResendAttachmentList(
  emailId: string
): Promise<ResendAttachmentRef[]> {
  const response = await resendRequest(
    `/emails/${encodeURIComponent(emailId)}/attachments`
  );
  const payload = await parseResendJsonResponse(response);

  if (!response.ok) {
    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound attachment list from Resend"
    );
  }

  const data = unwrapPayload(payload);
  const candidates: unknown =
    (Array.isArray(data) ? data : null) ||
    (Array.isArray(data.attachments) ? data.attachments : null) ||
    (Array.isArray(data.data) ? data.data : null);

  if (!Array.isArray(candidates)) {
    return [];
  }

  const refs: ResendAttachmentRef[] = [];
  for (const candidate of candidates) {
    const attachment = asAttachmentRef(candidate);
    if (attachment) {
      refs.push(attachment);
    }
  }

  return refs;
}

function base64ToBuffer(value: string): Buffer {
  // Remove optional data URL prefix if present.
  const base64 = value.includes(",") ? value.split(",").pop() || value : value;
  return Buffer.from(base64, "base64");
}

function tryExtractBufferFromJsonPayload(payload: unknown): Buffer | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    record.content,
    record.base64,
    record.data,
    "data" in record && record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>).content
      : null,
    "data" in record && record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>).base64
      : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      try {
        return base64ToBuffer(candidate);
      } catch {
        continue;
      }
    }
  }

  return null;
}

export async function fetchResendAttachmentBinary(
  emailId: string,
  attachmentId: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const response = await resendRequest(
    `/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(
      attachmentId
    )}`
  );

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await parseResendJsonResponse(response);
    } catch {
      payload = null;
    }

    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound attachment from Resend"
    );
  }

  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);

  if (contentType?.includes("application/json")) {
    try {
      const parsed = JSON.parse(bodyBuffer.toString("utf8")) as unknown;
      const decoded = tryExtractBufferFromJsonPayload(parsed);
      if (decoded) {
        return {
          buffer: decoded,
          contentType: "application/octet-stream",
        };
      }
    } catch {
      // Fall through and return raw body.
    }
  }

  return {
    buffer: bodyBuffer,
    contentType,
  };
}
