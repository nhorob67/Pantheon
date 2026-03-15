import assert from "node:assert/strict";
import test from "node:test";
import type { TenantRuntimeRun } from "../../types/tenant-runtime.ts";
import {
  buildDiscordRuntimeCompletionNotificationContent,
  shouldSendDiscordRuntimeCompletionNotification,
} from "./tenant-runtime-status-notifier-utils.ts";

function buildRun(
  overrides: Partial<TenantRuntimeRun> = {}
): TenantRuntimeRun {
  return {
    id: "run-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    run_kind: "discord_runtime",
    source: "discord_ingress",
    status: "completed",
    attempt_count: 1,
    max_attempts: 3,
    idempotency_key: "key-1",
    request_trace_id: "trace-1",
    correlation_id: "key-1",
    payload: {
      channel_id: "channel-1",
      message_id: "message-1",
    },
    result: {},
    error_message: null,
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    canceled_at: null,
    lock_expires_at: null,
    worker_id: "worker-1",
    metadata: {
      notify_on_completion: true,
      completion_notification_source: "team_default",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("buildDiscordRuntimeCompletionNotificationContent prefers response preview on completion", () => {
  const run = buildRun({
    result: {
      response_preview: "Created agent \"Iris\" and saved the new configuration.",
    },
  });

  assert.equal(
    buildDiscordRuntimeCompletionNotificationContent(run),
    "Task complete. Created agent \"Iris\" and saved the new configuration."
  );
});

test("buildDiscordRuntimeCompletionNotificationContent renders failure details", () => {
  const run = buildRun({
    status: "failed",
    error_message: "The Discord dispatch timed out.",
  });

  assert.equal(
    buildDiscordRuntimeCompletionNotificationContent(run),
    "Task failed. The Discord dispatch timed out."
  );
});

test("shouldSendDiscordRuntimeCompletionNotification skips when disabled", () => {
  const run = buildRun({
    metadata: {
      notify_on_completion: false,
    },
  });

  assert.equal(shouldSendDiscordRuntimeCompletionNotification(run), false);
});

test("shouldSendDiscordRuntimeCompletionNotification skips duplicate terminal event", () => {
  const run = buildRun({
    metadata: {
      notify_on_completion: true,
      completion_notification_source: "team_default",
      completion_notification_event: "completed",
      completion_notification_sent_at: new Date().toISOString(),
    },
  });

  assert.equal(shouldSendDiscordRuntimeCompletionNotification(run), false);
});

test("shouldSendDiscordRuntimeCompletionNotification suppresses cron defaults", () => {
  const run = buildRun({
    payload: {
      channel_id: "channel-1",
      message_id: "message-1",
      run_kind: "discord_cron",
    },
  });

  assert.equal(shouldSendDiscordRuntimeCompletionNotification(run), false);
});

test("shouldSendDiscordRuntimeCompletionNotification allows explicit cron override", () => {
  const run = buildRun({
    payload: {
      channel_id: "channel-1",
      message_id: "message-1",
      run_kind: "discord_cron",
    },
    metadata: {
      notify_on_completion: true,
      completion_notification_source: "run_override",
    },
  });

  assert.equal(shouldSendDiscordRuntimeCompletionNotification(run), true);
});
