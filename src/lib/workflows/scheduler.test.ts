import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScheduledRunCorrelationId,
  floorDateToUtcMinute,
  isCronDueAt,
  resolveScheduledTrigger,
} from "./scheduler.ts";

test("resolveScheduledTrigger returns defaults when cron and timezone are missing", () => {
  const trigger = resolveScheduledTrigger({
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        config: {
          trigger_kind: "schedule",
        },
      },
    ],
    edges: [],
  });

  assert.deepEqual(trigger, {
    trigger_node_id: "trigger-1",
    cron: "0 6 * * *",
    timezone: "UTC",
  });
});

test("resolveScheduledTrigger returns null for non-schedule trigger", () => {
  const trigger = resolveScheduledTrigger({
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        config: {
          trigger_kind: "manual",
        },
      },
    ],
    edges: [],
  });

  assert.equal(trigger, null);
});

test("isCronDueAt matches schedule in configured timezone", () => {
  const dueDate = new Date("2026-02-16T14:30:00.000Z"); // 08:30 America/Chicago
  const notDueDate = new Date("2026-02-16T14:31:00.000Z");

  const due = isCronDueAt("30 8 * * *", "America/Chicago", dueDate);
  const notDue = isCronDueAt("30 8 * * *", "America/Chicago", notDueDate);

  assert.deepEqual(due, { due: true, invalid: false });
  assert.deepEqual(notDue, { due: false, invalid: false });
});

test("isCronDueAt applies OR semantics for day-of-month and day-of-week", () => {
  // Monday match via day-of-week field.
  const monday = new Date("2026-02-02T15:00:00.000Z"); // 09:00 America/Chicago
  // First-of-month match via day-of-month field.
  const firstOfMonth = new Date("2026-03-01T15:00:00.000Z"); // 09:00 America/Chicago

  const mondayResult = isCronDueAt("0 9 1 * 1", "America/Chicago", monday);
  const firstOfMonthResult = isCronDueAt(
    "0 9 1 * 1",
    "America/Chicago",
    firstOfMonth
  );

  assert.deepEqual(mondayResult, { due: true, invalid: false });
  assert.deepEqual(firstOfMonthResult, { due: true, invalid: false });
});

test("isCronDueAt reports invalid for malformed cron expressions", () => {
  const result = isCronDueAt("invalid-cron", "UTC", new Date("2026-02-16T00:00:00.000Z"));
  assert.deepEqual(result, { due: false, invalid: true });
});

test("floorDateToUtcMinute drops seconds and milliseconds", () => {
  const floored = floorDateToUtcMinute(new Date("2026-02-16T14:30:49.900Z"));
  assert.equal(floored.toISOString(), "2026-02-16T14:30:00.000Z");
});

test("buildScheduledRunCorrelationId is stable per workflow/version/slot", () => {
  const sameA = buildScheduledRunCorrelationId(
    "workflow-123",
    7,
    "2026-02-16T14:30:00.000Z"
  );
  const sameB = buildScheduledRunCorrelationId(
    "workflow-123",
    7,
    "2026-02-16T14:30:00.000Z"
  );
  const differentSlot = buildScheduledRunCorrelationId(
    "workflow-123",
    7,
    "2026-02-16T14:31:00.000Z"
  );

  assert.equal(sameA, sameB);
  assert.notEqual(sameA, differentSlot);
});
