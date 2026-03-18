import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sendDiscordChannelMessageWithFiles,
  type DiscordFileAttachment,
} from "./tenant-runtime-discord.ts";

describe("sendDiscordChannelMessageWithFiles", () => {
  it("falls back to text-only when no files provided", async () => {
    let capturedContentType: string | undefined;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedContentType = (init?.headers as Record<string, string>)?.["Content-Type"];
      return new Response(JSON.stringify({ id: "msg_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await sendDiscordChannelMessageWithFiles(
      {
        botToken: "test-token",
        channelId: "channel-1",
        content: "Hello",
        files: [],
      },
      mockFetch as unknown as typeof fetch
    );

    assert.equal(result.status, 200);
    assert.equal(result.messageId, "msg_123");
    // Should use JSON (text-only path), not FormData
    assert.equal(capturedContentType, "application/json");
  });

  it("sends multipart/form-data when files are provided", async () => {
    let capturedBody: FormData | undefined;
    let hadContentTypeHeader = false;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      // When using FormData, Content-Type should NOT be set manually
      hadContentTypeHeader = "Content-Type" in ((init?.headers as Record<string, string>) || {});
      if (init?.body instanceof FormData) {
        capturedBody = init.body;
      }
      return new Response(JSON.stringify({ id: "msg_456" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const attachment: DiscordFileAttachment = {
      name: "report.csv",
      data: Buffer.from("Name,Age\nAlice,30\n"),
      contentType: "text/csv",
    };

    const result = await sendDiscordChannelMessageWithFiles(
      {
        botToken: "test-token",
        channelId: "channel-1",
        content: "Here's your report",
        files: [attachment],
      },
      mockFetch as unknown as typeof fetch
    );

    assert.equal(result.status, 200);
    assert.equal(result.messageId, "msg_456");
    // Content-Type should NOT be manually set when using FormData
    assert.equal(hadContentTypeHeader, false);
    // Should have used FormData
    assert.ok(capturedBody instanceof FormData);
  });

  it("includes reply reference when provided", async () => {
    let capturedPayloadJson: string | undefined;

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      if (init?.body instanceof FormData) {
        capturedPayloadJson = init.body.get("payload_json") as string;
      }
      return new Response(JSON.stringify({ id: "msg_789" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await sendDiscordChannelMessageWithFiles(
      {
        botToken: "test-token",
        channelId: "channel-1",
        content: "Reply with file",
        files: [
          {
            name: "data.json",
            data: Buffer.from("{}"),
            contentType: "application/json",
          },
        ],
        replyToMessageId: "original_msg_id",
      },
      mockFetch as unknown as typeof fetch
    );

    assert.ok(capturedPayloadJson);
    const parsed = JSON.parse(capturedPayloadJson!);
    assert.equal(parsed.message_reference.message_id, "original_msg_id");
  });

  it("throws DiscordApiError on non-200 response", async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ message: "Forbidden" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    await assert.rejects(
      () =>
        sendDiscordChannelMessageWithFiles(
          {
            botToken: "test-token",
            channelId: "channel-1",
            content: "Test",
            files: [
              {
                name: "file.txt",
                data: Buffer.from("hello"),
                contentType: "text/plain",
              },
            ],
          },
          mockFetch as unknown as typeof fetch
        ),
      (err: Error) => {
        assert.ok(err.message.includes("Forbidden"));
        return true;
      }
    );
  });
});
