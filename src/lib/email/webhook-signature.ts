import { createHmac, timingSafeEqual } from "node:crypto";

interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

interface VerifySvixSignatureInput {
  payload: string;
  headers: SvixHeaders;
  secret: string;
  toleranceSeconds?: number;
}

function decodeSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  const encoded = trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed;
  const decoded = Buffer.from(encoded, "base64");
  return decoded.length > 0 ? decoded : Buffer.from(trimmed, "utf8");
}

function extractV1Signatures(signatureHeader: string): string[] {
  return signatureHeader
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(","))
    .filter((parts) => parts.length === 2 && parts[0] === "v1")
    .map((parts) => parts[1].trim())
    .filter(Boolean);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifySvixSignature({
  payload,
  headers,
  secret,
  toleranceSeconds = 60,
}: VerifySvixSignatureInput): void {
  const id = headers.id;
  const timestamp = headers.timestamp;
  const signature = headers.signature;

  if (!id || !timestamp || !signature) {
    throw new Error("Missing Svix signature headers");
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) {
    throw new Error("Invalid Svix timestamp");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - sentAt) > toleranceSeconds) {
    throw new Error("Webhook timestamp outside allowed tolerance");
  }

  const key = decodeSecret(secret);
  const signedPayload = `${id}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", key)
    .update(signedPayload)
    .digest("base64");

  const signatures = extractV1Signatures(signature);
  if (signatures.length === 0) {
    throw new Error("No v1 signature found");
  }

  const valid = signatures.some((candidate) => safeEqual(candidate, expected));
  if (!valid) {
    throw new Error("Invalid webhook signature");
  }
}
