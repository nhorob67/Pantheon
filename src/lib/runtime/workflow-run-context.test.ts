import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkflowRunContextCommand,
  buildWorkflowRunContextPayload,
} from "./workflow-run-context.ts";

const BASE_INPUT = {
  runId: "run-1",
  workflowId: "workflow-1",
  sourceVersion: 7,
  runtimeCorrelationId: "runtime-correlation-1",
  requestTraceId: "request-trace-1",
  inputPayload: { topic: "market" },
  metadata: { source: "test" },
  startedAt: "2026-02-23T00:00:00.000Z",
};

test("buildWorkflowRunContextPayload includes request trace id for worker propagation", () => {
  const payload = buildWorkflowRunContextPayload(BASE_INPUT);

  assert.equal(payload.request_trace_id, "request-trace-1");
  assert.equal(payload.runtime_correlation_id, "runtime-correlation-1");
  assert.deepEqual(payload.input_payload, { topic: "market" });
});

test("buildWorkflowRunContextCommand encodes context and trace env assignments", () => {
  const command = buildWorkflowRunContextCommand(BASE_INPUT, "console.log('ok')");

  assert.match(command, /PANTHEON_RUN_CONTEXT_B64='/);
  assert.match(command, /PANTHEON_REQUEST_TRACE_ID='request-trace-1'/);
  assert.match(command, /node -e '/);
});
