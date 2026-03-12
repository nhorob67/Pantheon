import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHeartbeatSignalFingerprint,
  collectHeartbeatAlertSignals,
  deriveHeartbeatSignalSeverity,
  prefixHeartbeatIssueSummary,
} from "./signals.ts";

test("buildHeartbeatSignalFingerprint is stable for reordered payloads", () => {
  const left = buildHeartbeatSignalFingerprint("unanswered_emails", {
    count: 5,
    threshold_hours: 2,
  });
  const right = buildHeartbeatSignalFingerprint("unanswered_emails", {
    threshold_hours: 2,
    count: 5,
  });

  assert.equal(left, right);
});

test("collectHeartbeatAlertSignals returns only alerting checks", () => {
  const signals = collectHeartbeatAlertSignals({
    custom_checks: { status: "ok", summary: "No custom checks" },
    unanswered_emails: {
      status: "alert",
      summary: "3 unanswered email(s) older than 2h",
      data: { count: 3, threshold_hours: 2 },
    },
  });

  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.key, "unanswered_emails");
  assert.equal(signals[0]?.severity, 3);
});

test("deriveHeartbeatSignalSeverity escalates with higher email counts", () => {
  assert.equal(
    deriveHeartbeatSignalSeverity("unanswered_emails", { count: 1 }),
    2
  );
  assert.equal(
    deriveHeartbeatSignalSeverity("unanswered_emails", { count: 5 }),
    4
  );
  assert.equal(
    deriveHeartbeatSignalSeverity("unanswered_emails", { count: 12 }),
    5
  );
});

test("deriveHeartbeatSignalSeverity scales custom checks by item count", () => {
  assert.equal(
    deriveHeartbeatSignalSeverity("custom_checks", { items: ["a", "b"] }),
    3
  );
  assert.equal(
    deriveHeartbeatSignalSeverity("custom_checks", { items: ["a", "b", "c", "d", "e"] }),
    4
  );
});

test("prefixHeartbeatIssueSummary reflects lifecycle-aware framing", () => {
  assert.equal(
    prefixHeartbeatIssueSummary("new_issue", "3 unanswered email(s) older than 2h"),
    "New issue: 3 unanswered email(s) older than 2h"
  );
  assert.equal(
    prefixHeartbeatIssueSummary("reminder", "3 unanswered email(s) older than 2h"),
    "Still unresolved: 3 unanswered email(s) older than 2h"
  );
});
