import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHeartbeatSignalFingerprint,
  collectHeartbeatAlertSignals,
  deriveHeartbeatSignalSeverity,
  prefixHeartbeatIssueSummary,
} from "./signals.ts";

test("buildHeartbeatSignalFingerprint is stable for reordered payloads", () => {
  const left = buildHeartbeatSignalFingerprint("weather_severe", {
    alerts: [{ event: "Wind", expires: "2026-03-09T20:00:00Z" }],
    zone: "IAC001",
  });
  const right = buildHeartbeatSignalFingerprint("weather_severe", {
    zone: "IAC001",
    alerts: [{ expires: "2026-03-09T20:00:00Z", event: "Wind" }],
  });

  assert.equal(left, right);
});

test("collectHeartbeatAlertSignals returns only alerting checks", () => {
  const signals = collectHeartbeatAlertSignals({
    weather_severe: { status: "ok", summary: "No alerts" },
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

test("deriveHeartbeatSignalSeverity escalates larger grain moves", () => {
  assert.equal(
    deriveHeartbeatSignalSeverity("grain_price_movement", [
      { change_cents: 12 },
      { change_cents: -31 },
    ]),
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
