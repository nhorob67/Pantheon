import assert from "node:assert/strict";
import test from "node:test";
import {
  CircuitBreakerOpenError,
  resetCircuitBreakerState,
  runWithCircuitBreaker,
} from "./tenant-runtime-circuit-breaker.ts";

test("circuit breaker opens after failure threshold and blocks until cooldown", async () => {
  let nowMs = 1_000;
  const key = "test:circuit-open";
  resetCircuitBreakerState(key);

  const options = {
    failureThreshold: 2,
    cooldownMs: 50,
    now: () => nowMs,
  };

  await assert.rejects(
    () =>
      runWithCircuitBreaker(
        key,
        async () => {
          throw new Error("fail-1");
        },
        options
      ),
    /fail-1/
  );

  await assert.rejects(
    () =>
      runWithCircuitBreaker(
        key,
        async () => {
          throw new Error("fail-2");
        },
        options
      ),
    /fail-2/
  );

  await assert.rejects(
    () =>
      runWithCircuitBreaker(
        key,
        async () => "ok",
        options
      ),
    (error) => {
      assert.ok(error instanceof CircuitBreakerOpenError);
      assert.equal(error.retryAfterMs, 50);
      return true;
    }
  );

  nowMs += 55;
  const value = await runWithCircuitBreaker(
    key,
    async () => "recovered",
    options
  );
  assert.equal(value, "recovered");
});

test("circuit breaker resets failure streak after a success", async () => {
  const key = "test:circuit-reset";
  resetCircuitBreakerState(key);

  const options = {
    failureThreshold: 2,
    cooldownMs: 100,
  };

  await assert.rejects(
    () =>
      runWithCircuitBreaker(
        key,
        async () => {
          throw new Error("single-failure");
        },
        options
      ),
    /single-failure/
  );

  const ok = await runWithCircuitBreaker(
    key,
    async () => "ok",
    options
  );
  assert.equal(ok, "ok");

  await assert.rejects(
    () =>
      runWithCircuitBreaker(
        key,
        async () => {
          throw new Error("second-failure-after-reset");
        },
        options
      ),
    /second-failure-after-reset/
  );
});
