import assert from "node:assert/strict";
import test from "node:test";
import { computeTenantRuntimeRetryDelaySeconds } from "./tenant-runtime-retry.ts";

test("tenant runtime retry delay uses exponential backoff", () => {
  assert.equal(computeTenantRuntimeRetryDelaySeconds(1), 15);
  assert.equal(computeTenantRuntimeRetryDelaySeconds(2), 30);
  assert.equal(computeTenantRuntimeRetryDelaySeconds(3), 60);
  assert.equal(computeTenantRuntimeRetryDelaySeconds(4), 120);
});

test("tenant runtime retry delay is capped", () => {
  assert.equal(computeTenantRuntimeRetryDelaySeconds(5), 240);
  assert.equal(computeTenantRuntimeRetryDelaySeconds(6), 300);
  assert.equal(computeTenantRuntimeRetryDelaySeconds(10), 300);
});
