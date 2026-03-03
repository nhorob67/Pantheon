import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTenantRuntimeRunTransition,
  transitionTenantRuntimeRunState,
} from "./tenant-runtime-run-state.ts";

test("tenant runtime state machine allows expected happy-path transitions", () => {
  assert.equal(transitionTenantRuntimeRunState("queued", "start"), "running");
  assert.equal(
    transitionTenantRuntimeRunState("running", "request_approval"),
    "awaiting_approval"
  );
  assert.equal(
    transitionTenantRuntimeRunState("awaiting_approval", "resume_after_approval"),
    "running"
  );
  assert.equal(transitionTenantRuntimeRunState("running", "complete"), "completed");
});

test("tenant runtime state machine allows cancel and retry from allowed states", () => {
  assert.equal(transitionTenantRuntimeRunState("queued", "cancel"), "canceled");
  assert.equal(transitionTenantRuntimeRunState("failed", "retry"), "queued");
  assert.equal(transitionTenantRuntimeRunState("awaiting_approval", "retry"), "queued");
  assert.equal(transitionTenantRuntimeRunState("failed", "cancel"), "canceled");
});

test("tenant runtime state machine rejects invalid transitions", () => {
  assert.equal(transitionTenantRuntimeRunState("queued", "complete"), null);
  assert.equal(transitionTenantRuntimeRunState("completed", "retry"), null);
  assert.equal(transitionTenantRuntimeRunState("canceled", "start"), null);

  assert.throws(
    () => assertTenantRuntimeRunTransition("queued", "complete"),
    /Invalid tenant runtime run transition/
  );
});
