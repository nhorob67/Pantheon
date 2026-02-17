import test from "node:test";
import assert from "node:assert/strict";
import { createDocsAskHandler } from "../../../../lib/docs/ask-handler.ts";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/docs/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAuthClient(userId: string | null) {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: userId ? { id: userId } : null,
          },
        };
      },
    },
  };
}

function parseInput(input: unknown) {
  const payload = input as { query?: string; slugs?: string[] };
  if (typeof payload.query !== "string") {
    return { success: false as const, details: { query: "required" } };
  }

  return {
    success: true as const,
    data: {
      query: payload.query,
      slugs: Array.isArray(payload.slugs) ? payload.slugs : [],
    },
  };
}

test("POST /api/docs/ask returns 401 when not authenticated", async () => {
  const handler = createDocsAskHandler({
    createClient: async () => makeAuthClient(null),
    consumeDurableRateLimit: async () => true,
    parseInput,
    getAllDocs: () => [],
    getDocBySlug: () => null,
    stripMdx: (content) => content,
    fetchFn: fetch,
    getOpenRouterApiKey: () => "test-key",
  });

  const response = await handler(makeRequest({ query: "How do I start?", slugs: [] }));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("POST /api/docs/ask returns 429 when user is rate-limited", async () => {
  const handler = createDocsAskHandler({
    createClient: async () => makeAuthClient("user-1"),
    consumeDurableRateLimit: async () => false,
    parseInput,
    getAllDocs: () => [],
    getDocBySlug: () => null,
    stripMdx: (content) => content,
    fetchFn: fetch,
    getOpenRouterApiKey: () => "test-key",
  });

  const response = await handler(makeRequest({ query: "How do I start?", slugs: [] }));

  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), {
    error: "Too many questions. Please wait a moment.",
  });
});

test("POST /api/docs/ask streams model content and grounded sources", async () => {
  let capturedBody: Record<string, unknown> | null = null;

  const handler = createDocsAskHandler({
    createClient: async () => makeAuthClient("user-1"),
    consumeDurableRateLimit: async () => true,
    parseInput,
    getOpenRouterApiKey: () => "test-key",
    getAllDocs: () => [],
    getDocBySlug: (slug) => {
      if (slug !== "getting-started/quick-start") return null;

      return {
        slug,
        frontmatter: {
          title: "Quick Start",
          description: "Get started fast",
          section: "Getting Started",
          order: 1,
        },
        content: "## Setup\nConnect your account and run your first workflow.",
      };
    },
    stripMdx: (content) => content,
    fetchFn: async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body || "{}")) as Record<
        string,
        unknown
      >;

      const sse = [
        'data: {"choices":[{"delta":{"content":"Use the quick start guide."}}]}',
        "",
        "data: [DONE]",
        "",
      ].join("\n");

      return new Response(sse, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    },
  });

  const response = await handler(
    makeRequest({
      query: "How do I set this up?",
      slugs: ["getting-started/quick-start"],
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/event-stream");

  const text = await response.text();
  assert.match(text, /"sources":\[\{"title":"Quick Start","slug":"getting-started\/quick-start"\}\]/);
  assert.match(text, /"content":"Use the quick start guide."/);
  assert.match(text, /data: \[DONE\]/);

  assert.ok(capturedBody);
  const requestBody = capturedBody as Record<string, unknown>;
  assert.equal(requestBody["model"], "anthropic/claude-sonnet-4-5");
  const messages = requestBody["messages"] as Array<{ role: string; content: string }>;
  assert.equal(messages[0].role, "system");
  assert.match(messages[1].content, /Allowed source links:/);
});
