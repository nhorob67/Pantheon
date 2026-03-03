import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordRuntimeResponseParts,
  buildDiscordCanaryResponseContent,
  DiscordApiError,
  DISCORD_CANARY_PREFIX,
  isDiscordCanaryLoopContent,
  sendDiscordChannelMessage,
  sendDiscordChannelMessageSequence,
} from "./tenant-runtime-discord.ts";

test("buildDiscordCanaryResponseContent prefixes and clamps payload", () => {
  const content = buildDiscordCanaryResponseContent("hello world");
  assert.equal(content, `${DISCORD_CANARY_PREFIX} Echo: hello world`);

  const long = buildDiscordCanaryResponseContent("x".repeat(5000));
  assert.ok(long.startsWith(`${DISCORD_CANARY_PREFIX} Echo: `));
  assert.equal(long.length, 1900);
  assert.ok(long.endsWith("..."));
});

test("isDiscordCanaryLoopContent detects self-echo payloads", () => {
  assert.equal(isDiscordCanaryLoopContent(`${DISCORD_CANARY_PREFIX} Echo: hi`), true);
  assert.equal(isDiscordCanaryLoopContent("regular user message"), false);
});

test("sendDiscordChannelMessage posts to Discord and returns message id", async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const fakeFetch: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: "msg-123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await sendDiscordChannelMessage(
    {
      botToken: "token",
      channelId: "123",
      content: "hi",
      replyToMessageId: "999",
    },
    fakeFetch
  );

  assert.equal(result.messageId, "msg-123");
  assert.equal(result.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/channels\/123\/messages$/);
  assert.equal((calls[0].init?.method || "").toUpperCase(), "POST");
});

test("sendDiscordChannelMessage throws on non-2xx responses", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ message: "Missing Access" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    () =>
      sendDiscordChannelMessage(
        {
          botToken: "token",
          channelId: "123",
          content: "hi",
        },
        fakeFetch
      ),
    /Missing Access/
  );
});

test("sendDiscordChannelMessage surfaces retry delay from Discord rate limits", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ message: "rate limited", retry_after: 2.1 }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "2",
      },
    });

  await assert.rejects(
    () =>
      sendDiscordChannelMessage(
        {
          botToken: "token",
          channelId: "123",
          content: "hi",
        },
        fakeFetch
      ),
    (error) => {
      assert.ok(error instanceof DiscordApiError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterSeconds, 2);
      return true;
    }
  );
});

test("buildDiscordRuntimeResponseParts emits prefixed multi-part payloads", () => {
  const parts = buildDiscordRuntimeResponseParts("x".repeat(5000));

  assert.equal(parts.length, 3);
  assert.ok(parts[0].startsWith("[1/3] "));
  assert.ok(parts[1].startsWith("[2/3] "));
  assert.ok(parts[2].startsWith("[3/3] "));
  assert.ok(parts.every((part) => part.length <= 1900));
});

test("buildDiscordRuntimeResponseParts truncates when max part budget is exceeded", () => {
  const parts = buildDiscordRuntimeResponseParts("z".repeat(20000));

  assert.equal(parts.length, 4);
  assert.ok(parts[3].endsWith("..."));
  assert.ok(parts.every((part) => part.length <= 1900));
});

test("sendDiscordChannelMessageSequence sends all parts and only first part replies", async () => {
  const calls: Array<{ body: Record<string, unknown> }> = [];

  const fakeFetch: typeof fetch = async (_url, init) => {
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : {};
    calls.push({ body });
    return new Response(JSON.stringify({ id: `msg-${calls.length}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await sendDiscordChannelMessageSequence(
    {
      botToken: "token",
      channelId: "123",
      contents: ["part-1", "part-2", "part-3"],
      replyToMessageId: "origin-msg",
    },
    fakeFetch
  );

  assert.equal(calls.length, 3);
  assert.deepEqual(result.messageIds, ["msg-1", "msg-2", "msg-3"]);
  assert.equal(result.partsSent, 3);
  assert.equal(result.status, 200);
  assert.ok(typeof calls[0].body.message_reference === "object");
  assert.equal(calls[1].body.message_reference, undefined);
  assert.equal(calls[2].body.message_reference, undefined);
});
