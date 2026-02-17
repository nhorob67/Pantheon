import test from "node:test";
import assert from "node:assert/strict";
import { ensurePublishedWorkflowRuntimeFreshness } from "./publish-runtime-freshness.ts";

test("publish freshness succeeds when deploy succeeds", async () => {
  let rollbackCalled = false;

  const result = await ensurePublishedWorkflowRuntimeFreshness({
    deploy: async () => undefined,
    rollbackPublishedState: async () => {
      rollbackCalled = true;
      return { success: true } as const;
    },
    formatError: (error, fallback) =>
      error instanceof Error ? error.message : fallback,
  });

  assert.equal(result.ok, true);
  assert.equal(rollbackCalled, false);
});

test("publish freshness returns deploy failure when deploy fails and rollback succeeds", async () => {
  const result = await ensurePublishedWorkflowRuntimeFreshness({
    deploy: async () => {
      throw new Error("deploy failed");
    },
    rollbackPublishedState: async () => ({ success: true } as const),
    formatError: (error, fallback) =>
      error instanceof Error ? `safe:${error.message}` : fallback,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 503,
    code: "WORKFLOW_DEPLOY_FAILED",
    error: "safe:deploy failed",
  });
});

test("publish freshness returns rollback failure when deploy and rollback both fail", async () => {
  const result = await ensurePublishedWorkflowRuntimeFreshness({
    deploy: async () => {
      throw new Error("deploy failed");
    },
    rollbackPublishedState: async () => ({
      success: false,
      error: new Error("rollback failed"),
    }),
    formatError: (error, fallback) =>
      error instanceof Error ? `safe:${error.message}` : fallback,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 500,
    code: "WORKFLOW_DEPLOY_FAILED_ROLLBACK_FAILED",
    error:
      "Workflow publish failed during runtime deploy and automatic rollback failed. Retry publish after verifying workflow state.",
    rollback_error_message: "safe:rollback failed",
  });
});
