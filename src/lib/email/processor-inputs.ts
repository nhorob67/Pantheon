export interface ProcessInboundBody {
  batch_size?: number;
  max_retries?: number;
}

export const DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES_HARD_LIMIT = 100 * 1024 * 1024;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function parseNumberParam(value: string | null): number | undefined {
  if (value === null) return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseProcessInboundQueryParams(urlValue: string): ProcessInboundBody {
  const url = new URL(urlValue);

  return {
    batch_size: parseNumberParam(url.searchParams.get("batch_size")),
    max_retries: parseNumberParam(url.searchParams.get("max_retries")),
  };
}

export function resolveMaxAttachmentBytes(
  envValue?: string
): number {
  if (!envValue) {
    return DEFAULT_MAX_ATTACHMENT_BYTES;
  }

  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ATTACHMENT_BYTES;
  }

  return Math.min(Math.trunc(parsed), MAX_ATTACHMENT_BYTES_HARD_LIMIT);
}

export function maxBase64LengthForBytes(maxBytes: number): number {
  return Math.ceil(maxBytes / 3) * 4;
}

export function stripBase64Prefix(contentBase64: string): string {
  const payload = contentBase64.includes(",")
    ? contentBase64.split(",").pop() || contentBase64
    : contentBase64;
  return payload.replace(/\s+/g, "");
}

export function decodeAttachmentBase64(contentBase64: string): Buffer {
  const normalized = stripBase64Prefix(contentBase64);

  if (!normalized) {
    throw new Error("Attachment content was empty");
  }

  if (normalized.length % 4 !== 0 || !BASE64_REGEX.test(normalized)) {
    throw new Error("Attachment content is not valid base64");
  }

  return Buffer.from(normalized, "base64");
}
