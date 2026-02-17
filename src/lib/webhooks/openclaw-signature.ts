import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export function createOpenClawSignature(
  body: string,
  timestamp: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verifyOpenClawSignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): boolean {
  if (!signature || !timestamp || !secret) {
    return false;
  }

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return false;
  }

  const age = Math.abs(Date.now() - ts);
  if (age > TIMESTAMP_TOLERANCE_MS) {
    return false;
  }

  const expected = createOpenClawSignature(body, timestamp, secret);

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, signatureBuf);
}
