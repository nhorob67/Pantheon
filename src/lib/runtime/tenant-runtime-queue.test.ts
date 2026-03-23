import assert from "node:assert/strict";
import test from "node:test";
import type { TenantRuntimeRun } from "@/types/tenant-runtime";
import { sessionLaneBlocksRun } from "./tenant-runtime-queue.ts";

function makeRun(
  overrides: Partial<TenantRuntimeRun> = {}
): TenantRuntimeRun {
  return {
    id: "run-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    session_id: "session-1",
    run_kind: "discord_runtime",
    source: "discord_ingress",
    status: "queued",
    attempt_count: 0,
    max_attempts: 3,
    idempotency_key: null,
    request_trace_id: null,
    correlation_id: null,
    payload: {},
    result: {},
    error_message: null,
    queued_at: "2026-03-22T10:00:00.000Z",
    started_at: null,
    completed_at: null,
    canceled_at: null,
    lock_expires_at: null,
    worker_id: null,
    parent_run_id: null,
    delegation_depth: 0,
    deadline_at: null,
    delegation_kind: null,
    metadata: {},
    created_at: "2026-03-22T10:00:00.000Z",
    updated_at: "2026-03-22T10:00:00.000Z",
    ...overrides,
  };
}

test("sessionLaneBlocksRun blocks later queued work in the same session", () => {
  const earlier = makeRun({
    id: "run-earlier",
    queued_at: "2026-03-22T10:00:00.000Z",
    created_at: "2026-03-22T10:00:00.000Z",
  });
  const later = makeRun({
    id: "run-later",
    queued_at: "2026-03-22T10:01:00.000Z",
    created_at: "2026-03-22T10:01:00.000Z",
  });

  assert.equal(sessionLaneBlocksRun(later, earlier), true);
  assert.equal(sessionLaneBlocksRun(earlier, later), false);
});

test("sessionLaneBlocksRun blocks active work in the same session", () => {
  const running = makeRun({
    id: "run-running",
    status: "running",
  });
  const queued = makeRun({
    id: "run-queued",
    queued_at: "2026-03-22T10:05:00.000Z",
    created_at: "2026-03-22T10:05:00.000Z",
  });

  assert.equal(sessionLaneBlocksRun(queued, running), true);
});

test("sessionLaneBlocksRun ignores different sessions", () => {
  const blocker = makeRun({ session_id: "session-a" });
  const candidate = makeRun({
    id: "run-2",
    session_id: "session-b",
    queued_at: "2026-03-22T10:01:00.000Z",
    created_at: "2026-03-22T10:01:00.000Z",
  });

  assert.equal(sessionLaneBlocksRun(candidate, blocker), false);
});

test("sessionLaneBlocksRun ignores non-lane run kinds", () => {
  const followUp = makeRun({
    id: "run-follow-up",
    run_kind: "discord_follow_up",
  });
  const candidate = makeRun({
    id: "run-queued",
    queued_at: "2026-03-22T10:02:00.000Z",
    created_at: "2026-03-22T10:02:00.000Z",
  });

  assert.equal(sessionLaneBlocksRun(candidate, followUp), false);
});
