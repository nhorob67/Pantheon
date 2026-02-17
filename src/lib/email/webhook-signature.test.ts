import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { verifySvixSignature } from "./webhook-signature.ts";

function decodeSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  const encoded = trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed;
  const decoded = Buffer.from(encoded, "base64");
  return decoded.length > 0 ? decoded : Buffer.from(trimmed, "utf8");
}

function signPayload(input: {
  id: string;
  timestamp: string;
  payload: string;
  secret: string;
}): string {
  const key = decodeSecret(input.secret);
  const signedPayload = `${input.id}.${input.timestamp}.${input.payload}`;
  const digest = createHmac("sha256", key).update(signedPayload).digest("base64");
  return `v1,${digest}`;
}

function nowTimestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

test("verifySvixSignature accepts valid signature", () => {
  const payload = JSON.stringify({ type: "message.received" });
  const secret = "my-secret-value";
  const id = "evt_123";
  const timestamp = nowTimestamp();
  const signature = signPayload({ id, timestamp, payload, secret });

  assert.doesNotThrow(() =>
    verifySvixSignature({
      payload,
      headers: { id, timestamp, signature },
      secret,
    })
  );
});

test("verifySvixSignature accepts whsec_ base64 secret", () => {
  const payload = JSON.stringify({ type: "message.received", id: "mail_1" });
  const base64Secret = randomBytes(32).toString("base64");
  const secret = `whsec_${base64Secret}`;
  const id = "evt_abc";
  const timestamp = nowTimestamp();
  const signature = signPayload({ id, timestamp, payload, secret });

  assert.doesNotThrow(() =>
    verifySvixSignature({
      payload,
      headers: { id, timestamp, signature },
      secret,
    })
  );
});

test("verifySvixSignature accepts matching candidate among multiple signatures", () => {
  const payload = JSON.stringify({ type: "message.received", id: "mail_2" });
  const secret = "another-secret";
  const id = "evt_multi";
  const timestamp = nowTimestamp();
  const valid = signPayload({ id, timestamp, payload, secret });
  const signature = `${valid} v1,invalid-signature v0,legacy`;

  assert.doesNotThrow(() =>
    verifySvixSignature({
      payload,
      headers: { id, timestamp, signature },
      secret,
    })
  );
});

test("verifySvixSignature rejects missing headers", () => {
  const payload = "{}";
  assert.throws(
    () =>
      verifySvixSignature({
        payload,
        headers: { id: null, timestamp: nowTimestamp(), signature: "v1,abc" },
        secret: "secret",
      }),
    /Missing Svix signature headers/
  );
});

test("verifySvixSignature rejects invalid timestamp", () => {
  const payload = "{}";
  assert.throws(
    () =>
      verifySvixSignature({
        payload,
        headers: { id: "evt_1", timestamp: "not-a-number", signature: "v1,abc" },
        secret: "secret",
      }),
    /Invalid Svix timestamp/
  );
});

test("verifySvixSignature rejects stale timestamp outside tolerance", () => {
  const payload = "{}";
  const secret = "stale-secret";
  const id = "evt_old";
  const timestamp = String(Math.floor(Date.now() / 1000) - 1000);
  const signature = signPayload({ id, timestamp, payload, secret });

  assert.throws(
    () =>
      verifySvixSignature({
        payload,
        headers: { id, timestamp, signature },
        secret,
        toleranceSeconds: 60,
      }),
    /Webhook timestamp outside allowed tolerance/
  );
});

test("verifySvixSignature rejects header without v1 signature", () => {
  assert.throws(
    () =>
      verifySvixSignature({
        payload: "{}",
        headers: {
          id: "evt_1",
          timestamp: nowTimestamp(),
          signature: "v0,abc",
        },
        secret: "secret",
      }),
    /No v1 signature found/
  );
});

test("verifySvixSignature rejects invalid signature", () => {
  assert.throws(
    () =>
      verifySvixSignature({
        payload: JSON.stringify({ id: "mail_3" }),
        headers: {
          id: "evt_1",
          timestamp: nowTimestamp(),
          signature: "v1,not-the-real-signature",
        },
        secret: "secret",
      }),
    /Invalid webhook signature/
  );
});
