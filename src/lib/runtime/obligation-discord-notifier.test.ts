import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeObligation } from "@/types/obligation";
import { shouldSendLegacyDiscordObligationStatusReply } from "./obligation-discord-notifier.ts";

function makeObligation(
  overrides: Partial<RuntimeObligation> = {}
): RuntimeObligation {
  return {
    id: "obl-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    session_id: null,
    channel_id: "channel-1",
    reply_to_message_id: "message-1",
    agent_id: null,
    originating_run_id: "run-1",
    current_run_id: "run-1",
    completion_run_id: null,
    status: "open",
    waiting_on: null,
    resume_token: null,
    next_check_at: null,
    last_progress_at: new Date().toISOString(),
    last_user_update_at: null,
    deadline_at: new Date().toISOString(),
    continuation_count: 0,
    max_continuations: 5,
    dedupe_key: null,
    metadata: {
      run_kind: "discord_runtime",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("shouldSendLegacyDiscordObligationStatusReply suppresses non-terminal discord_runtime updates", () => {
  const obligation = makeObligation();

  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "approval_granted"),
    false
  );
  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "stalled"),
    false
  );
});

test("shouldSendLegacyDiscordObligationStatusReply allows terminal discord_runtime fallbacks", () => {
  const obligation = makeObligation({
    status: "failed",
  });

  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "failed"),
    true
  );
  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "completed"),
    true
  );
});

test("shouldSendLegacyDiscordObligationStatusReply preserves legacy behavior for non-discord runtimes", () => {
  const obligation = makeObligation({
    metadata: {
      run_kind: "email_runtime",
    },
  });

  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "approval_granted"),
    true
  );
  assert.equal(
    shouldSendLegacyDiscordObligationStatusReply(obligation, "stalled"),
    true
  );
});
