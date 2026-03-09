import test from "node:test";
import assert from "node:assert/strict";
import { shouldRequireHeartbeatApproval } from "./approvals.ts";

test("shouldRequireHeartbeatApproval requires approval for live custom check alerts", () => {
  const result = shouldRequireHeartbeatApproval({
    triggerMode: "scheduled",
    issueContexts: [
      {
        fingerprint: "fp-1",
        attention_type: "new_issue",
        signal_type: "custom_checks",
        severity: 3,
        state: "new",
        summary: "2 custom check(s) need LLM evaluation",
        first_seen_at: "2026-03-09T12:00:00.000Z",
        last_notified_at: null,
        snoozed_until: null,
      },
    ],
  });

  assert.equal(result, true);
});

test("shouldRequireHeartbeatApproval skips approval for preview and test flows", () => {
  assert.equal(
    shouldRequireHeartbeatApproval({
      triggerMode: "manual_preview",
      issueContexts: [
        {
          fingerprint: "fp-2",
          attention_type: "new_issue",
          signal_type: "custom_checks",
          severity: 3,
          state: "new",
          summary: "custom",
          first_seen_at: "2026-03-09T12:00:00.000Z",
          last_notified_at: null,
          snoozed_until: null,
        },
      ],
    }),
    false
  );
  assert.equal(
    shouldRequireHeartbeatApproval({
      triggerMode: "manual_test",
      issueContexts: [
        {
          fingerprint: "fp-3",
          attention_type: "new_issue",
          signal_type: "custom_checks",
          severity: 3,
          state: "new",
          summary: "custom",
          first_seen_at: "2026-03-09T12:00:00.000Z",
          last_notified_at: null,
          snoozed_until: null,
        },
      ],
    }),
    false
  );
});

test("shouldRequireHeartbeatApproval lets urgent weather bypass custom check approval", () => {
  const result = shouldRequireHeartbeatApproval({
    triggerMode: "scheduled",
    issueContexts: [
      {
        fingerprint: "weather-fp",
        attention_type: "new_issue",
        signal_type: "weather_severe",
        severity: 4,
        state: "new",
        summary: "Severe thunderstorm warning",
        first_seen_at: "2026-03-09T12:00:00.000Z",
        last_notified_at: null,
        snoozed_until: null,
      },
      {
        fingerprint: "custom-fp",
        attention_type: "new_issue",
        signal_type: "custom_checks",
        severity: 3,
        state: "new",
        summary: "custom",
        first_seen_at: "2026-03-09T12:00:00.000Z",
        last_notified_at: null,
        snoozed_until: null,
      },
    ],
  });

  assert.equal(result, false);
});
