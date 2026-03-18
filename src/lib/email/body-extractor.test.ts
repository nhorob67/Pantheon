import test from "node:test";
import assert from "node:assert/strict";
import { extractBodyFromPayload } from "./body-extractor.ts";

test("extractBodyFromPayload reads nested AgentMail message body text", async () => {
  const body = await extractBodyFromPayload({
    message: {
      body: {
        text: "Hello from AgentMail",
      },
    },
  });

  assert.equal(body, "Hello from AgentMail");
});

test("extractBodyFromPayload falls back to nested AgentMail html", async () => {
  const body = await extractBodyFromPayload({
    message: {
      html: "<p>Hello <strong>there</strong></p>",
    },
  });

  assert.equal(body, "Hello there");
});
