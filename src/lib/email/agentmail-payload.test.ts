import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAgentMailProviderMessageId,
  normalizeAgentMailMessagePayload,
} from "./agentmail-payload.ts";

test("normalizeAgentMailMessagePayload merges nested message fields", () => {
  const payload = normalizeAgentMailMessagePayload({
    created_at: "2026-03-17T00:00:00Z",
    message: {
      id: "msg_123",
      subject: "Hello",
    },
  });

  assert.equal(payload.id, "msg_123");
  assert.equal(payload.subject, "Hello");
  assert.equal(payload.created_at, "2026-03-17T00:00:00Z");
});

test("extractAgentMailProviderMessageId returns the provider resource id only", () => {
  assert.equal(
    extractAgentMailProviderMessageId({
      id: "msg_456",
      message_id: "<internet@example.com>",
    }),
    "msg_456"
  );

  assert.equal(
    extractAgentMailProviderMessageId({
      message_id: "<internet@example.com>",
    }),
    null
  );
});
