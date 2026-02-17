import test from "node:test";
import assert from "node:assert/strict";
import { createDocsAskFeedbackHandler } from "../../../../lib/docs/ask-feedback-handler.ts";
import type { DocsAskFeedbackSurface } from "../../../../lib/docs/ask-feedback-surface.ts";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/docs/ask-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "test-agent" },
    body: JSON.stringify(body),
  });
}

function makeFeedbackClient(input: { userId: string | null; customerId: string | null }) {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: input.userId ? { id: input.userId } : null,
          },
        };
      },
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return {
                    data: input.customerId ? { id: input.customerId } : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function parseInput(input: unknown) {
  const payload = input as {
    query?: string;
    helpful?: boolean;
    sources?: Array<{ title: string; slug: string }>;
    surface?: "docs_modal" | "dashboard_help_modal";
  };

  if (typeof payload.query !== "string" || typeof payload.helpful !== "boolean") {
    return { success: false as const, details: { invalid: true } };
  }

  const surface: DocsAskFeedbackSurface =
    payload.surface === "dashboard_help_modal"
      ? "dashboard_help_modal"
      : "docs_modal";

  return {
    success: true as const,
    data: {
      query: payload.query,
      helpful: payload.helpful,
      sources: Array.isArray(payload.sources) ? payload.sources : [],
      surface,
    },
  };
}

test("POST /api/docs/ask-feedback returns 401 when not authenticated", async () => {
  const handler = createDocsAskFeedbackHandler({
    createClient: async () => makeFeedbackClient({ userId: null, customerId: null }),
    createAdminClient: () => ({
      from() {
        return {
          async insert() {
            return { error: null };
          },
        };
      },
    }),
    consumeDurableRateLimit: async () => true,
    parseInput,
  });

  const response = await handler(
    makeRequest({
      query: "How do I set this up?",
      helpful: true,
      sources: [],
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("POST /api/docs/ask-feedback writes telemetry metadata", async () => {
  let inserted: Record<string, unknown> | null = null;

  const handler = createDocsAskFeedbackHandler({
    createClient: async () =>
      makeFeedbackClient({ userId: "user-1", customerId: "customer-1" }),
    consumeDurableRateLimit: async () => true,
    parseInput,
    createAdminClient: () => ({
      from() {
        return {
          async insert(value) {
            inserted = value;
            return { error: null };
          },
        };
      },
    }),
  });

  const response = await handler(
    makeRequest({
      query: "How do I set this up?",
      helpful: false,
      sources: [{ title: "Quick Start", slug: "getting-started/quick-start" }],
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });

  assert.ok(inserted);
  const insertedEvent = inserted as Record<string, unknown>;
  assert.equal(insertedEvent["customer_id"], "customer-1");
  assert.equal(insertedEvent["event_type"], "docs_ask_feedback");

  const metadata = insertedEvent["metadata"] as {
    query: string;
    helpful: boolean;
    source_count: number;
    user_agent: string;
    surface: "docs_modal" | "dashboard_help_modal";
    route: string;
  };

  assert.equal(metadata.query, "How do I set this up?");
  assert.equal(metadata.helpful, false);
  assert.equal(metadata.source_count, 1);
  assert.equal(metadata.user_agent, "test-agent");
  assert.equal(metadata.surface, "docs_modal");
  assert.equal(metadata.route, "/docs modal");
});

test("POST /api/docs/ask-feedback tags dashboard help modal surface", async () => {
  let inserted: Record<string, unknown> | null = null;

  const handler = createDocsAskFeedbackHandler({
    createClient: async () =>
      makeFeedbackClient({ userId: "user-1", customerId: "customer-1" }),
    consumeDurableRateLimit: async () => true,
    parseInput,
    createAdminClient: () => ({
      from() {
        return {
          async insert(value) {
            inserted = value;
            return { error: null };
          },
        };
      },
    }),
  });

  const response = await handler(
    makeRequest({
      query: "How do I set this up?",
      helpful: true,
      sources: [],
      surface: "dashboard_help_modal",
    })
  );

  assert.equal(response.status, 200);
  assert.ok(inserted);
  const insertedEvent = inserted as Record<string, unknown>;

  const metadata = insertedEvent["metadata"] as {
    surface: "docs_modal" | "dashboard_help_modal";
    route: string;
  };

  assert.equal(metadata.surface, "dashboard_help_modal");
  assert.equal(metadata.route, "/dashboard help modal");
});

test("POST /api/docs/ask-feedback returns 202 when telemetry table is unavailable", async () => {
  const handler = createDocsAskFeedbackHandler({
    createClient: async () =>
      makeFeedbackClient({ userId: "user-1", customerId: "customer-1" }),
    consumeDurableRateLimit: async () => true,
    parseInput,
    createAdminClient: () => ({
      from() {
        return {
          async insert() {
            return { error: { code: "42P01", message: "missing table" } };
          },
        };
      },
    }),
  });

  const response = await handler(
    makeRequest({
      query: "How do I set this up?",
      helpful: true,
      sources: [],
    })
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
});
