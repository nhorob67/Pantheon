import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyOpenClawSignature } from "./openclaw-signature.ts";

const SECRET = "test-secret-key-for-webhooks";

function sign(body: string, timestamp: string): string {
  return createHmac("sha256", SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

test("valid signature is accepted", () => {
  const body = '{"type":"conversation.activity"}';
  const ts = String(Date.now());
  const sig = sign(body, ts);
  assert.equal(verifyOpenClawSignature(body, sig, ts, SECRET), true);
});

test("invalid signature is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  const ts = String(Date.now());
  assert.equal(
    verifyOpenClawSignature(body, "invalid-signature", ts, SECRET),
    false
  );
});

test("stale timestamp is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  const staleTs = String(Date.now() - 10 * 60 * 1000); // 10 min ago
  const sig = sign(body, staleTs);
  assert.equal(verifyOpenClawSignature(body, sig, staleTs, SECRET), false);
});

test("missing signature is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  assert.equal(
    verifyOpenClawSignature(body, null, String(Date.now()), SECRET),
    false
  );
});

test("missing timestamp is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  assert.equal(
    verifyOpenClawSignature(body, "some-sig", null, SECRET),
    false
  );
});

test("empty secret is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  const ts = String(Date.now());
  assert.equal(verifyOpenClawSignature(body, "sig", ts, ""), false);
});

test("non-numeric timestamp is rejected", () => {
  const body = '{"type":"conversation.activity"}';
  assert.equal(
    verifyOpenClawSignature(body, "sig", "not-a-number", SECRET),
    false
  );
});
