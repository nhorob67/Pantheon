import assert from "node:assert/strict";
import test from "node:test";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";
import {
  buildAsyncDelegationQueuedContent,
  buildAsyncDelegationTerminalContent,
  resolveDiscordLifecycleReplyContext,
} from "./tenant-runtime-discord-lifecycle-utils.ts";

function buildRun(overrides: Partial<TenantRuntimeRun> = {}): TenantRuntimeRun {
  return {
    id: "run-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    run_kind: "delegation_runtime",
    source: "system",
    status: "completed",
    attempt_count: 1,
    max_attempts: 3,
    idempotency_key: "key-1",
    request_trace_id: "trace-1",
    correlation_id: "corr-1",
    payload: {
      channel_id: "channel-1",
      message_id: "message-1",
      target_agent_name: "Iris",
    },
    result: {
      target_agent_name: "Iris",
      response_preview: "The report is drafted and ready for review.",
    },
    error_message: null,
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    canceled_at: null,
    lock_expires_at: null,
    worker_id: "worker-1",
    parent_run_id: "parent-1",
    delegation_depth: 1,
    deadline_at: null,
    delegation_kind: "async",
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("resolveDiscordLifecycleReplyContext prefers payload context", () => {
  const context = resolveDiscordLifecycleReplyContext(buildRun());

  assert.deepEqual(context, {
    channelId: "channel-1",
    replyToMessageId: "message-1",
  });
});

test("resolveDiscordLifecycleReplyContext falls back to lifecycle metadata", () => {
  const context = resolveDiscordLifecycleReplyContext(
    buildRun({
      payload: {},
      metadata: {
        lifecycle_channel_id: "fallback-channel",
        lifecycle_reply_to_message_id: "fallback-message",
      },
    })
  );

  assert.deepEqual(context, {
    channelId: "fallback-channel",
    replyToMessageId: "fallback-message",
  });
});

test("buildAsyncDelegationQueuedContent sounds like a conversational handoff", () => {
  assert.equal(
    buildAsyncDelegationQueuedContent("Iris"),
    "Quick update - I'm looping in Iris on that piece. I'll keep you posted here."
  );
});

test("buildAsyncDelegationTerminalContent summarizes completed child work", () => {
  const content = buildAsyncDelegationTerminalContent(buildRun());

  assert.equal(
    content,
    "Quick update - Iris finished their part. The report is drafted and ready for review."
  );
});

test("buildAsyncDelegationTerminalContent summarizes failed child work", () => {
  const content = buildAsyncDelegationTerminalContent(
    buildRun({
      status: "failed",
      result: {
        target_agent_name: "Iris",
      },
      error_message: "The upstream API timed out twice.",
    })
  );

  assert.equal(
    content,
    "Quick update - Iris hit a snag. The upstream API timed out twice."
  );
});
