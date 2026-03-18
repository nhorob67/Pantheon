import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentMailSendPayload } from "./agentmail-send.ts";

test("buildAgentMailSendPayload includes the provisioned inbox id", () => {
  const payload = buildAgentMailSendPayload({
    mailboxId: "inbox_123",
    fromEmail: "agent@pantheon.app",
    toEmail: "user@example.com",
    subject: "Re: Hello",
    text: "Reply body",
    headers: {
      "In-Reply-To": "<msg@example.com>",
    },
  });

  assert.deepEqual(payload, {
    inbox_id: "inbox_123",
    from: "agent@pantheon.app",
    to: "user@example.com",
    subject: "Re: Hello",
    text: "Reply body",
    headers: {
      "In-Reply-To": "<msg@example.com>",
    },
  });
});
