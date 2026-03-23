import assert from "node:assert/strict";
import test from "node:test";
import {
  isApprovalAckOnlyMessage,
  isRecentApprovedAckCandidate,
} from "./discord-approval-ack.ts";

test("isApprovalAckOnlyMessage matches narrow approval acknowledgements", () => {
  assert.equal(isApprovalAckOnlyMessage("I approved it"), true);
  assert.equal(isApprovalAckOnlyMessage("approved"), true);
  assert.equal(isApprovalAckOnlyMessage("It's approved."), true);
});

test("isApprovalAckOnlyMessage rejects substantive follow-up requests", () => {
  assert.equal(isApprovalAckOnlyMessage("I approved it, please continue"), false);
  assert.equal(isApprovalAckOnlyMessage("I approved it and also change the timezone"), false);
  assert.equal(isApprovalAckOnlyMessage("Can you confirm it was approved?"), false);
});

test("isRecentApprovedAckCandidate requires same channel and recent approval", () => {
  const now = new Date("2026-03-22T19:25:00.000Z");

  assert.equal(
    isRecentApprovedAckCandidate(
      {
        decided_at: "2026-03-22T19:24:00.000Z",
        discord_channel_id: "channel-1",
      },
      {
        channelId: "channel-1",
        now,
      }
    ),
    true
  );

  assert.equal(
    isRecentApprovedAckCandidate(
      {
        decided_at: "2026-03-22T19:24:00.000Z",
        discord_channel_id: "channel-2",
      },
      {
        channelId: "channel-1",
        now,
      }
    ),
    false
  );

  assert.equal(
    isRecentApprovedAckCandidate(
      {
        decided_at: "2026-03-22T19:00:00.000Z",
        discord_channel_id: "channel-1",
      },
      {
        channelId: "channel-1",
        now,
      }
    ),
    false
  );
});

test("isRecentApprovedAckCandidate falls back to request payload channel", () => {
  const now = new Date("2026-03-22T19:25:00.000Z");

  assert.equal(
    isRecentApprovedAckCandidate(
      {
        decided_at: "2026-03-22T19:24:00.000Z",
        request_payload: {
          channel_id: "channel-1",
        },
      },
      {
        channelId: "channel-1",
        now,
      }
    ),
    true
  );
});
