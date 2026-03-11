export interface WorkflowRunContextInput {
  runId: string;
  workflowId: string;
  sourceVersion: number;
  runtimeCorrelationId: string;
  requestTraceId: string;
  inputPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  startedAt: string;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function buildWorkflowRunContextPayload(
  input: WorkflowRunContextInput
): Record<string, unknown> {
  return {
    run_id: input.runId,
    workflow_id: input.workflowId,
    source_version: input.sourceVersion,
    runtime_correlation_id: input.runtimeCorrelationId,
    request_trace_id: input.requestTraceId,
    input_payload: input.inputPayload,
    metadata: input.metadata,
    started_at: input.startedAt,
  };
}

export function buildWorkflowRunContextCommand(
  input: WorkflowRunContextInput,
  workerScript: string
): string {
  const contextPayload = buildWorkflowRunContextPayload(input);
  const encodedContext = Buffer.from(JSON.stringify(contextPayload)).toString("base64");
  const contextAssignment = `PANTHEON_RUN_CONTEXT_B64=${shellQuote(encodedContext)}`;
  const traceAssignment = `PANTHEON_REQUEST_TRACE_ID=${shellQuote(
    input.requestTraceId
  )}`;
  const workerCommand = `node -e ${shellQuote(workerScript)}`;

  return `${contextAssignment} ${traceAssignment} ${workerCommand}`;
}
