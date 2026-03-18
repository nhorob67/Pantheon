import test from "node:test";
import assert from "node:assert/strict";
import { extractThreadingHeaders, resolveThreadId } from "./threading.ts";

test("extractThreadingHeaders reads AgentMail snake_case metadata", () => {
  const headers = extractThreadingHeaders({
    message_id: "<msg-1@example.com>",
    in_reply_to: "<parent@example.com>",
    references_header: "<root@example.com> <parent@example.com>",
  });

  assert.deepEqual(headers, {
    messageId: "<msg-1@example.com>",
    inReplyTo: "<parent@example.com>",
    references: "<root@example.com> <parent@example.com>",
  });
});

test("extractThreadingHeaders prefers nested headers when present", () => {
  const headers = extractThreadingHeaders({
    message_id: "<stale@example.com>",
    headers: {
      "message-id": "<msg-2@example.com>",
      "in-reply-to": "<parent-2@example.com>",
      references: "<root-2@example.com> <parent-2@example.com>",
    },
  });

  assert.deepEqual(headers, {
    messageId: "<msg-2@example.com>",
    inReplyTo: "<parent-2@example.com>",
    references: "<root-2@example.com> <parent-2@example.com>",
  });
});

test("resolveThreadId uses the first message in the references chain", () => {
  const threadId = resolveThreadId({
    messageId: "<msg-3@example.com>",
    inReplyTo: "<parent-3@example.com>",
    references: "<root-3@example.com> <parent-3@example.com>",
  });

  assert.equal(threadId, "<root-3@example.com>");
});
