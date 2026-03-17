import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createWebFetchTool } from "./web-fetch.ts";

type ToolWithExecute = { execute: (args: Record<string, unknown>) => Promise<unknown> };

// Mock global fetch for tests
const originalFetch = globalThis.fetch;

function mockFetch(
  body: string,
  opts?: {
    status?: number;
    statusText?: string;
    contentType?: string;
    headers?: Record<string, string>;
  }
) {
  const status = opts?.status ?? 200;
  const statusText = opts?.statusText ?? "OK";
  const contentType = opts?.contentType ?? "text/html";
  const headers = new Headers({
    "content-type": contentType,
    ...(opts?.headers ?? {}),
  });

  globalThis.fetch = (async () =>
    new Response(body, { status, statusText, headers })) as typeof fetch;
}

describe("web_fetch tool", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches and extracts text from HTML", async () => {
    mockFetch(
      "<html><head><title>Test Page</title><meta name=\"description\" content=\"A test.\"></head>" +
        "<body><h1>Hello</h1><p>World</p><script>evil();</script></body></html>"
    );

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/page",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.equal(result.url, "https://example.com/page");
    assert.equal(result.title, "Test Page");
    assert.equal(result.description, "A test.");
    assert.ok((result.content as string).includes("Hello"));
    assert.ok((result.content as string).includes("World"));
    assert.ok(!(result.content as string).includes("evil"));
    assert.ok(result.fetched_at);
  });

  it("returns raw content in raw mode", async () => {
    mockFetch('{"key": "value"}', { contentType: "application/json" });

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://api.example.com/data.json",
      extract_mode: "raw",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.equal(result.content, '{"key": "value"}');
    assert.equal(result.content_type, "application/json");
  });

  it("rejects non-HTTPS URLs", async () => {
    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "http://example.com",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("HTTPS"));
  });

  it("blocks internal/private hosts", async () => {
    const { web_fetch } = createWebFetchTool();
    const blocked = [
      "https://localhost/path",
      "https://127.0.0.1/path",
      "https://192.168.1.1/path",
      "https://10.0.0.1/path",
      "https://metadata.google.internal/path",
    ];

    for (const url of blocked) {
      const result = (await (web_fetch as unknown as ToolWithExecute).execute({
        url,
        extract_mode: "text",
        max_length: 16000,
      })) as Record<string, unknown>;

      assert.ok(result.error, `Expected error for ${url}`);
      assert.ok((result.error as string).includes("internal/private"), `Expected SSRF block for ${url}`);
    }
  });

  it("rejects binary content types", async () => {
    mockFetch("binary data", { contentType: "image/png" });

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/image.png",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("not supported"));
  });

  it("truncates long content", async () => {
    mockFetch("<html><body>" + "x".repeat(20000) + "</body></html>");

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/long",
      extract_mode: "text",
      max_length: 500,
    })) as Record<string, unknown>;

    assert.ok((result.content as string).length <= 520); // 500 + truncation marker
    assert.equal(result.truncated, true);
  });

  it("handles HTTP error responses", async () => {
    mockFetch("Not Found", { status: 404, statusText: "Not Found" });

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/missing",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("404"));
    assert.equal(result.status, 404);
  });

  it("handles invalid URLs", async () => {
    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "not-a-url",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok(result.error);
  });

  it("handles fetch errors", async () => {
    globalThis.fetch = (async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/down",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("Network error"));
  });

  it("handles timeout errors", async () => {
    globalThis.fetch = (async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    }) as typeof fetch;

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/slow",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.ok((result.error as string).includes("timed out"));
  });

  it("extracts title and description from HTML", async () => {
    mockFetch(
      '<html><head><title>My Title</title>' +
        '<meta name="description" content="My description here">' +
        "</head><body><p>content</p></body></html>"
    );

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com",
      extract_mode: "text",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.equal(result.title, "My Title");
    assert.equal(result.description, "My description here");
  });

  it("allows plain text content type", async () => {
    mockFetch("Just plain text.", { contentType: "text/plain" });

    const { web_fetch } = createWebFetchTool();
    const result = (await (web_fetch as unknown as ToolWithExecute).execute({
      url: "https://example.com/robots.txt",
      extract_mode: "raw",
      max_length: 16000,
    })) as Record<string, unknown>;

    assert.equal(result.content, "Just plain text.");
    assert.equal(result.content_type, "text/plain");
  });
});
