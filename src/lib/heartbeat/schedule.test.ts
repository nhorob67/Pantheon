import test from "node:test";
import assert from "node:assert/strict";
import { isWithinHeartbeatActiveHours } from "./schedule.ts";

test("isWithinHeartbeatActiveHours respects standard daytime windows", () => {
  const at = new Date("2026-03-09T16:00:00.000Z");
  assert.equal(
    isWithinHeartbeatActiveHours("America/Chicago", "05:00", "21:00", at),
    true
  );
  assert.equal(
    isWithinHeartbeatActiveHours("America/Chicago", "18:00", "21:00", at),
    false
  );
});

test("isWithinHeartbeatActiveHours supports overnight windows", () => {
  const lateEvening = new Date("2026-03-10T03:30:00.000Z");
  const earlyMorning = new Date("2026-03-10T09:30:00.000Z");

  assert.equal(
    isWithinHeartbeatActiveHours("America/Chicago", "21:00", "05:00", lateEvening),
    true
  );
  assert.equal(
    isWithinHeartbeatActiveHours("America/Chicago", "21:00", "05:00", earlyMorning),
    true
  );
  assert.equal(
    isWithinHeartbeatActiveHours("America/Chicago", "21:00", "05:00", new Date("2026-03-10T18:00:00.000Z")),
    false
  );
});

test("isWithinHeartbeatActiveHours treats matching start and end as all day", () => {
  assert.equal(
    isWithinHeartbeatActiveHours(
      "America/Chicago",
      "00:00",
      "00:00",
      new Date("2026-03-09T23:59:00.000Z")
    ),
    true
  );
});
