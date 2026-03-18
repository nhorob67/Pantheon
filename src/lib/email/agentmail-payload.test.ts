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

test("extractAgentMailProviderMessageId prefers id, falls back to message_id and messageId", () => {
  // Prefers .id when present
  assert.equal(
    extractAgentMailProviderMessageId({
      id: "msg_456",
      message_id: "<internet@example.com>",
    }),
    "msg_456"
  );

  // Falls back to message_id
  assert.equal(
    extractAgentMailProviderMessageId({
      message_id: "<internet@example.com>",
    }),
    "<internet@example.com>"
  );

  // Falls back to messageId
  assert.equal(
    extractAgentMailProviderMessageId({
      messageId: "msg_789",
    }),
    "msg_789"
  );

  // Returns null when no id fields present
  assert.equal(
    extractAgentMailProviderMessageId({
      subject: "Hello",
    }),
    null
  );
});
