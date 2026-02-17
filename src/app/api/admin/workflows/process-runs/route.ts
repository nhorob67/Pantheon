import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { decrypt } from "@/lib/crypto";
import { createOpenClawSignature } from "@/lib/webhooks/openclaw-signature";
import {
  buildWorkflowApprovalInsertRows,
  evaluateWorkflowRunApprovalGate,
  extractRequiredApprovalNodeIds,
  resolveWorkflowApprovalNodes,
} from "@/lib/workflows/approvals";
import {
  WORKFLOW_APPROVAL_STATUSES,
  WORKFLOW_NODE_TYPES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_RUN_STEP_STATUSES,
  type WorkflowApprovalStatus,
  type WorkflowNodeType,
  type WorkflowRunStatus,
  type WorkflowRunStepStatus,
} from "@/types/workflow";

export const runtime = "nodejs";

const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 100;
const MAX_ERROR_LENGTH = 2000;
const DEFAULT_GATEWAY_PORT = 18789;
const DEFAULT_RUNTIME_TIMEOUT_SECONDS = 180;
const DEFAULT_RUNTIME_YIELD_MS = 180000;
const DEFAULT_WEBHOOK_TIMEOUT_MS = 15000;
const RUN_PROCESS_CONCURRENCY = 5;

const WORKFLOW_GATEWAY_WORKER_SCRIPT = `
const parseJson = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();
const failResult = (message) => ({
  status: "failed",
  started_at: nowIso(),
  completed_at: nowIso(),
  error_message: message,
  output_payload: {},
  metadata: {
    executor: "gateway.exec.workflow_worker",
    failure_stage: "worker_bootstrap",
  },
  steps: [],
  artifacts: [],
});

try {
  const contextRaw = process.env.FARMCLAW_RUN_CONTEXT_B64 || "";
  const context = parseJson(Buffer.from(contextRaw, "base64").toString("utf8"), null);

  if (!context || typeof context !== "object") {
    console.log(JSON.stringify(failResult("Run context is missing or invalid.")));
    process.exit(0);
  }

  const packRaw = process.env.FARMCLAW_WORKFLOW_IR || "";
  const pack = parseJson(Buffer.from(packRaw, "base64").toString("utf8"), null);

  if (!pack || typeof pack !== "object" || !Array.isArray(pack.workflows)) {
    console.log(JSON.stringify(failResult("Runtime workflow IR pack is unavailable.")));
    process.exit(0);
  }

  const workflow = pack.workflows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      item.workflow_id === context.workflow_id &&
      Number(item.version) === Number(context.source_version)
  );

  if (!workflow || !Array.isArray(workflow.nodes)) {
    console.log(
      JSON.stringify(
        failResult("Workflow IR was not found for requested workflow/version.")
      )
    );
    process.exit(0);
  }

  const nodes = workflow.nodes
    .filter(
      (node) =>
        node &&
        typeof node === "object" &&
        typeof node.id === "string" &&
        typeof node.type === "string"
    )
    .map((node) => ({
      id: node.id,
      type: node.type,
      label: typeof node.label === "string" ? node.label : node.id,
      config: node && typeof node.config === "object" && node.config !== null ? node.config : {},
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const edges = Array.isArray(workflow.edges)
    ? workflow.edges
        .filter(
          (edge) =>
            edge &&
            typeof edge === "object" &&
            typeof edge.from === "string" &&
            typeof edge.to === "string"
        )
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          when: typeof edge.when === "string" ? edge.when : "always",
        }))
    : [];

  if (nodes.length === 0) {
    console.log(JSON.stringify(failResult("Workflow IR contains no executable nodes.")));
    process.exit(0);
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const triggerNode =
    nodes.find((node) => node.type === "trigger") ||
    nodes[0];

  const outgoing = new Map();
  for (const edge of edges) {
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) {
      continue;
    }

    const current = outgoing.get(edge.from) || [];
    current.push(edge);
    outgoing.set(edge.from, current);
  }

  const visited = new Set();
  const executionOrder = [];
  const queue = [triggerNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId) || !nodesById.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    executionOrder.push(nodeId);

    const node = nodesById.get(nodeId);
    const rawOutgoing = (outgoing.get(nodeId) || []).slice().sort((a, b) => {
      const keyA = a.when + ":" + a.to;
      const keyB = b.when + ":" + b.to;
      return keyA.localeCompare(keyB);
    });

    let selected = rawOutgoing;
    if (node && node.type === "condition") {
      const trueBranch = rawOutgoing.filter((edge) => edge.when === "true");
      const alwaysBranch = rawOutgoing.filter((edge) => edge.when === "always");
      const nonFalseBranch = rawOutgoing.filter((edge) => edge.when !== "false");
      selected =
        trueBranch.length > 0
          ? trueBranch
          : alwaysBranch.length > 0
            ? alwaysBranch
            : nonFalseBranch;
    } else {
      selected = rawOutgoing.filter((edge) => edge.when !== "false");
    }

    for (const edge of selected) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  if (executionOrder.length === 0) {
    executionOrder.push(triggerNode.id);
  }

  const baseMs = Date.now();
  const startAt = nowIso();
  const steps = [];
  let failedNodeId = null;

  for (let index = 0; index < executionOrder.length; index += 1) {
    const nodeId = executionOrder[index];
    const node = nodesById.get(nodeId);
    if (!node) {
      continue;
    }

    const startedAt = new Date(baseMs + index * 25).toISOString();
    const completedAt = new Date(baseMs + index * 25 + 10).toISOString();
    const forceFail =
      node.config &&
      typeof node.config === "object" &&
      (
        node.config.force_fail === true ||
        node.config.mock_status === "failed" ||
        node.config.simulate_failure === true
      );

    const status = failedNodeId
      ? "skipped"
      : forceFail
        ? "failed"
        : "succeeded";

    const step = {
      node_id: node.id,
      node_type: node.type,
      step_index: index,
      attempt: 1,
      status,
      input_payload: {
        run_input: context.input_payload && typeof context.input_payload === "object"
          ? context.input_payload
          : {},
      },
      output_payload:
        status === "failed"
          ? {}
          : {
              message: "Node executed via gateway workflow worker.",
              node_label: node.label,
            },
      error_message:
        status === "failed"
          ? "Node configured to force failure in workflow graph."
          : undefined,
      started_at: startedAt,
      completed_at: completedAt,
      metadata: {
        worker: "gateway.exec.workflow_worker",
      },
    };

    steps.push(step);

    if (status === "failed") {
      failedNodeId = node.id;
    }
  }

  const runStatus = failedNodeId ? "failed" : "succeeded";
  const completeAt = nowIso();
  const runtimeCorrelationId =
    typeof context.runtime_correlation_id === "string" &&
    context.runtime_correlation_id.length > 0
      ? context.runtime_correlation_id
      : context.run_id;

  const result = {
    status: runStatus,
    runtime_correlation_id: runtimeCorrelationId,
    started_at: startAt,
    completed_at: completeAt,
    output_payload: failedNodeId
      ? {}
      : {
          executed_node_ids: steps
            .filter((step) => step.status === "succeeded")
            .map((step) => step.node_id),
          executed_steps: steps.length,
        },
    error_message: failedNodeId
      ? "Workflow worker encountered a forced node failure."
      : undefined,
    metadata: {
      executor: "gateway.exec.workflow_worker",
      workflow_name:
        typeof workflow.name === "string" ? workflow.name : null,
      executed_steps: steps.length,
    },
    steps,
    artifacts: [
      {
        artifact_type: "workflow_run_summary",
        name: "workflow-run-" + context.run_id + ".json",
        mime_type: "application/json",
        payload: {
          run_id: context.run_id,
          workflow_id: context.workflow_id,
          status: runStatus,
          steps: steps.map((step) => ({
            node_id: step.node_id,
            status: step.status,
            step_index: step.step_index,
          })),
        },
        metadata: {
          generated_by: "gateway.exec.workflow_worker",
        },
      },
    ],
  };

  console.log(JSON.stringify(result));
  process.exit(0);
} catch (error) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error || "Unknown runtime worker error");

  console.log(
    JSON.stringify({
      status: "failed",
      started_at: nowIso(),
      completed_at: nowIso(),
      error_message: "Runtime worker threw: " + message,
      output_payload: {},
      metadata: {
        executor: "gateway.exec.workflow_worker",
        failure_stage: "worker_exception",
      },
      steps: [],
      artifacts: [],
    })
  );
  process.exit(0);
}
`.trim();

interface ProcessRunsBody {
  batch_size?: number;
}

interface QueuedRun {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  source_version: number;
  runtime_correlation_id: string | null;
  input_payload: unknown;
  metadata: unknown;
}

interface WorkflowDefinitionState {
  id: string;
  status: string;
  published_version: number | null;
}

interface WorkflowVersionSnapshot {
  workflow_id: string;
  version: number;
  graph: unknown;
}

interface WorkflowApprovalRow {
  id: string;
  run_id: string;
  node_id: string;
  status: string;
}

interface RuntimeExecutionInstance {
  id: string;
  server_ip: string | null;
  channel_config: unknown;
  webhook_secret_encrypted: string | null;
}

interface RunProcessTotals {
  dispatched: number;
  failed: number;
  skipped: number;
  runtimeSucceeded: number;
  runtimeFailed: number;
  approvalBlocked: number;
  approvalRejected: number;
}

interface GatewayToolInvokeEnvelope {
  ok?: boolean;
  result?: unknown;
  error?: {
    type?: string;
    message?: string;
  };
}

interface WorkflowWorkerStepResult {
  node_id: string;
  node_type: WorkflowNodeType;
  step_index: number;
  attempt: number;
  status: WorkflowRunStepStatus;
  input_payload?: Record<string, unknown>;
  output_payload?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

interface WorkflowWorkerArtifactResult {
  artifact_type: string;
  name: string;
  mime_type?: string;
  storage_bucket?: string;
  storage_path?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

interface WorkflowWorkerExecutionResult {
  status: WorkflowRunStatus;
  runtime_correlation_id: string;
  started_at: string;
  completed_at?: string;
  canceled_at?: string;
  output_payload?: Record<string, unknown>;
  error_message?: string;
  metadata?: Record<string, unknown>;
  steps: WorkflowWorkerStepResult[];
  artifacts: WorkflowWorkerArtifactResult[];
}

interface AuthorizationOptions {
  allowSessionAuth: boolean;
}

const WORKFLOW_NODE_TYPE_VALUES = new Set<WorkflowNodeType>(WORKFLOW_NODE_TYPES);
const WORKFLOW_STEP_STATUS_VALUES = new Set<WorkflowRunStepStatus>(
  WORKFLOW_RUN_STEP_STATUSES
);
const WORKFLOW_RUN_STATUS_VALUES = new Set<WorkflowRunStatus>(WORKFLOW_RUN_STATUSES);
const WORKFLOW_APPROVAL_STATUS_VALUES = new Set<WorkflowApprovalStatus>(
  WORKFLOW_APPROVAL_STATUSES
);

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const parsed = Math.trunc(value);
  if (parsed < min) {
    return min;
  }

  if (parsed > max) {
    return max;
  }

  return parsed;
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function errorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function readOptionalPositiveInt(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const value = Math.trunc(parsed);
  return value > 0 ? value : null;
}

function getGatewayPort(): number {
  return readOptionalPositiveInt(process.env.FARMCLAW_GATEWAY_PORT) || DEFAULT_GATEWAY_PORT;
}

function getRuntimeTimeoutSeconds(): number {
  return (
    readOptionalPositiveInt(process.env.FARMCLAW_WORKFLOW_RUNTIME_TIMEOUT_SECONDS) ||
    DEFAULT_RUNTIME_TIMEOUT_SECONDS
  );
}

function getRuntimeYieldMs(): number {
  return (
    readOptionalPositiveInt(process.env.FARMCLAW_WORKFLOW_RUNTIME_YIELD_MS) ||
    DEFAULT_RUNTIME_YIELD_MS
  );
}

function normalizeNodeType(value: unknown): WorkflowNodeType {
  if (typeof value === "string" && WORKFLOW_NODE_TYPE_VALUES.has(value as WorkflowNodeType)) {
    return value as WorkflowNodeType;
  }

  return "action";
}

function normalizeRunStatus(value: unknown): WorkflowRunStatus {
  if (typeof value === "string" && WORKFLOW_RUN_STATUS_VALUES.has(value as WorkflowRunStatus)) {
    return value as WorkflowRunStatus;
  }

  return "failed";
}

function normalizeStepStatus(value: unknown): WorkflowRunStepStatus {
  if (
    typeof value === "string" &&
    WORKFLOW_STEP_STATUS_VALUES.has(value as WorkflowRunStepStatus)
  ) {
    return value as WorkflowRunStepStatus;
  }

  return "failed";
}

function normalizeApprovalStatus(value: unknown): WorkflowApprovalStatus {
  if (
    typeof value === "string" &&
    WORKFLOW_APPROVAL_STATUS_VALUES.has(value as WorkflowApprovalStatus)
  ) {
    return value as WorkflowApprovalStatus;
  }

  return "pending";
}

function toIsoStringOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function getGatewayPasswordFromChannelConfig(channelConfig: unknown): string | null {
  const config = (channelConfig ?? {}) as { gateway_password_encrypted?: unknown };
  if (
    typeof config.gateway_password_encrypted === "string" &&
    config.gateway_password_encrypted.length > 0
  ) {
    try {
      return decrypt(config.gateway_password_encrypted);
    } catch {
      return null;
    }
  }

  return null;
}

function extractExitCode(result: unknown): number | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;
  const direct =
    record.exitCode ?? record.exit_code ?? record.code ?? record.exit_code_int;

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return Math.trunc(direct);
  }

  if (typeof direct === "string" && /^-?\d+$/.test(direct.trim())) {
    return Number(direct.trim());
  }

  return null;
}

function extractStatus(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const status = (result as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

function extractTextFromResult(value: unknown, depth = 0): string | null {
  if (depth > 3) {
    return null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const chunks = value
      .map((item) => extractTextFromResult(item, depth + 1))
      .filter((item): item is string => !!item && item.trim().length > 0);
    return chunks.length > 0 ? chunks.join("\n") : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = ["stdout", "output", "text", "message", "result"];
  for (const key of preferredKeys) {
    const direct = record[key];
    if (typeof direct === "string" && direct.trim().length > 0) {
      return direct;
    }
  }

  const nestedKeys = ["data", "payload", "response", "body", "result", "output"];
  for (const key of nestedKeys) {
    const nestedText = extractTextFromResult(record[key], depth + 1);
    if (nestedText && nestedText.trim().length > 0) {
      return nestedText;
    }
  }

  return null;
}

function parseJsonObjectFromText(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return normalizeObject(parsed);
  } catch {
    // continue
  }

  const lines = trimmed.split(/\r?\n/).reverse();
  for (const line of lines) {
    const candidate = line.trim();
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);
      return normalizeObject(parsed);
    } catch {
      // continue
    }
  }

  return null;
}

function buildRunContextCommand(run: QueuedRun, runtimeCorrelationId: string, startedAt: string) {
  const contextPayload = {
    run_id: run.id,
    workflow_id: run.workflow_id,
    source_version: run.source_version,
    runtime_correlation_id: runtimeCorrelationId,
    input_payload: normalizeObject(run.input_payload),
    metadata: normalizeObject(run.metadata),
    started_at: startedAt,
  };

  const encodedContext = Buffer.from(JSON.stringify(contextPayload)).toString("base64");
  const contextAssignment = `FARMCLAW_RUN_CONTEXT_B64=${shellQuote(encodedContext)}`;
  const workerCommand = `node -e ${shellQuote(WORKFLOW_GATEWAY_WORKER_SCRIPT)}`;

  return `${contextAssignment} ${workerCommand}`;
}

function normalizeWorkerExecutionResult(
  value: Record<string, unknown>,
  fallback: {
    runtimeCorrelationId: string;
    startedAt: string;
  }
): WorkflowWorkerExecutionResult {
  const parsedStatus = normalizeRunStatus(value.status);
  const status =
    parsedStatus === "succeeded" || parsedStatus === "canceled" ? parsedStatus : "failed";

  const startedAt = toIsoStringOrNull(value.started_at) || fallback.startedAt;
  const completedAt = toIsoStringOrNull(value.completed_at);
  const canceledAt = toIsoStringOrNull(value.canceled_at);

  const stepsRaw = Array.isArray(value.steps) ? value.steps : [];
  const steps: WorkflowWorkerStepResult[] = stepsRaw
    .map((entry, index) => {
      const record = normalizeObject(entry);
      const nodeId =
        typeof record.node_id === "string" && record.node_id.trim().length > 0
          ? record.node_id
          : `node-${index + 1}`;

      const stepIndexValue =
        typeof record.step_index === "number" && Number.isFinite(record.step_index)
          ? Math.max(0, Math.trunc(record.step_index))
          : index;

      const attemptValue =
        typeof record.attempt === "number" && Number.isFinite(record.attempt)
          ? Math.max(1, Math.trunc(record.attempt))
          : 1;

      const inputPayload = normalizeObject(record.input_payload);
      const outputPayload = normalizeObject(record.output_payload);
      const metadata = normalizeObject(record.metadata);

      return {
        node_id: nodeId,
        node_type: normalizeNodeType(record.node_type),
        step_index: stepIndexValue,
        attempt: attemptValue,
        status: normalizeStepStatus(record.status),
        ...(Object.keys(inputPayload).length > 0 ? { input_payload: inputPayload } : {}),
        ...(Object.keys(outputPayload).length > 0 ? { output_payload: outputPayload } : {}),
        ...(typeof record.error_message === "string" ? { error_message: record.error_message } : {}),
        ...(toIsoStringOrNull(record.started_at)
          ? { started_at: toIsoStringOrNull(record.started_at) as string }
          : {}),
        ...(toIsoStringOrNull(record.completed_at)
          ? { completed_at: toIsoStringOrNull(record.completed_at) as string }
          : {}),
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      };
    })
    .sort((a, b) =>
      a.step_index === b.step_index ? a.attempt - b.attempt : a.step_index - b.step_index
    );

  const artifactsRaw = Array.isArray(value.artifacts) ? value.artifacts : [];
  const artifacts: WorkflowWorkerArtifactResult[] = artifactsRaw
    .map((entry) => normalizeObject(entry))
    .filter(
      (artifact) =>
        typeof artifact.artifact_type === "string" &&
        artifact.artifact_type.trim().length > 0 &&
        typeof artifact.name === "string" &&
        artifact.name.trim().length > 0
    )
    .map((artifact) => ({
      artifact_type: artifact.artifact_type as string,
      name: artifact.name as string,
      ...(typeof artifact.mime_type === "string" ? { mime_type: artifact.mime_type } : {}),
      ...(typeof artifact.storage_bucket === "string"
        ? { storage_bucket: artifact.storage_bucket }
        : {}),
      ...(typeof artifact.storage_path === "string"
        ? { storage_path: artifact.storage_path }
        : {}),
      ...(artifact.payload !== undefined ? { payload: artifact.payload } : {}),
      ...(Object.keys(normalizeObject(artifact.metadata)).length > 0
        ? { metadata: normalizeObject(artifact.metadata) }
        : {}),
    }));

  const outputPayload = normalizeObject(value.output_payload);
  const metadata = normalizeObject(value.metadata);

  return {
    status,
    runtime_correlation_id:
      typeof value.runtime_correlation_id === "string" &&
      value.runtime_correlation_id.trim().length > 0
        ? value.runtime_correlation_id
        : fallback.runtimeCorrelationId,
    started_at: startedAt,
    ...(completedAt ? { completed_at: completedAt } : {}),
    ...(canceledAt ? { canceled_at: canceledAt } : {}),
    ...(Object.keys(outputPayload).length > 0 ? { output_payload: outputPayload } : {}),
    ...(typeof value.error_message === "string" ? { error_message: value.error_message } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    steps,
    artifacts,
  };
}

function buildRuntimeFailureResult(
  runtimeCorrelationId: string,
  startedAt: string,
  message: string
): WorkflowWorkerExecutionResult {
  const nowIso = new Date().toISOString();
  return {
    status: "failed",
    runtime_correlation_id: runtimeCorrelationId,
    started_at: startedAt,
    completed_at: nowIso,
    error_message: message,
    output_payload: {},
    metadata: {
      executor: "workflow-run-processor",
      failure_stage: "runtime_dispatch",
    },
    steps: [],
    artifacts: [],
  };
}

async function invokeWorkflowRuntimeWorker(
  instance: RuntimeExecutionInstance,
  run: QueuedRun,
  runtimeCorrelationId: string,
  startedAt: string
): Promise<WorkflowWorkerExecutionResult> {
  if (!instance.server_ip) {
    throw new Error("Instance has no server IP");
  }

  const gatewayPassword = getGatewayPasswordFromChannelConfig(instance.channel_config);
  if (!gatewayPassword) {
    throw new Error("Gateway password is unavailable");
  }

  const gatewayPort = getGatewayPort();
  const timeoutSeconds = getRuntimeTimeoutSeconds();
  const yieldMs = getRuntimeYieldMs();
  const command = buildRunContextCommand(run, runtimeCorrelationId, startedAt);
  const gatewayUrl = `http://${instance.server_ip}:${gatewayPort}/tools/invoke`;

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayPassword}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tool: "exec",
      action: "json",
      sessionKey: "main",
      args: {
        command,
        timeout: timeoutSeconds,
        yieldMs,
        background: false,
        pty: false,
      },
    }),
    signal: AbortSignal.timeout((timeoutSeconds + 20) * 1000),
  });

  const rawBody = await response.text();
  let payload: GatewayToolInvokeEnvelope | null = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as GatewayToolInvokeEnvelope;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `Gateway returned HTTP ${response.status} for workflow run`
    );
  }

  if (payload?.ok === false) {
    throw new Error(payload.error?.message || "Gateway tool invocation failed");
  }

  const exitCode = extractExitCode(payload?.result);
  if (exitCode !== null && exitCode !== 0) {
    throw new Error(`Runtime worker exited with code ${exitCode}`);
  }

  const toolStatus = extractStatus(payload?.result);
  if (toolStatus === "failed" || toolStatus === "error") {
    throw new Error(`Gateway exec status=${toolStatus}`);
  }

  const workerStdout = extractTextFromResult(payload?.result);
  if (!workerStdout) {
    throw new Error("Gateway worker returned no parseable output");
  }

  const workerObject = parseJsonObjectFromText(workerStdout);
  if (!workerObject) {
    throw new Error("Gateway worker output was not valid JSON");
  }

  const normalized = normalizeWorkerExecutionResult(workerObject, {
    runtimeCorrelationId,
    startedAt,
  });

  return {
    ...normalized,
    metadata: {
      ...normalizeObject(normalized.metadata),
      executor: "gateway.tools_invoke.exec",
      gateway_port: gatewayPort,
      timeout_seconds: timeoutSeconds,
      yield_ms: yieldMs,
    },
  };
}

function resolveWebhookUrl(request: Request): string {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBase && configuredBase.length > 0) {
    return `${configuredBase.replace(/\/$/, "")}/api/webhooks/openclaw`;
  }

  return new URL("/api/webhooks/openclaw", request.url).toString();
}

function buildRuntimeEventId(runId: string, eventType: string, index: number): string {
  const normalizedType = eventType.replace(/\./g, "-");
  return `runtime-${runId}-${String(index).padStart(4, "0")}-${normalizedType}`;
}

type RuntimeLifecycleEvent = {
  type: "workflow.run.state" | "workflow.run.step.state" | "workflow.run.artifact";
  data: Record<string, unknown>;
};

function buildLifecycleEvents(
  run: QueuedRun,
  dispatchedAt: string,
  result: WorkflowWorkerExecutionResult
): RuntimeLifecycleEvent[] {
  const events: RuntimeLifecycleEvent[] = [];
  const startedAt = result.started_at || dispatchedAt;

  events.push({
    type: "workflow.run.state",
    data: {
      run_id: run.id,
      status: "running",
      runtime_correlation_id: result.runtime_correlation_id,
      started_at: startedAt,
      metadata: {
        source: "workflow-run-processor",
      },
    },
  });

  for (const step of result.steps) {
    events.push({
      type: "workflow.run.step.state",
      data: {
        run_id: run.id,
        node_id: step.node_id,
        node_type: step.node_type,
        step_index: step.step_index,
        attempt: step.attempt,
        status: step.status,
        ...(step.input_payload ? { input_payload: step.input_payload } : {}),
        ...(step.output_payload ? { output_payload: step.output_payload } : {}),
        ...(step.error_message ? { error_message: step.error_message } : {}),
        ...(step.started_at ? { started_at: step.started_at } : {}),
        ...(step.completed_at ? { completed_at: step.completed_at } : {}),
        metadata: {
          ...normalizeObject(step.metadata),
          source: "workflow-run-processor",
        },
      },
    });
  }

  for (const artifact of result.artifacts) {
    events.push({
      type: "workflow.run.artifact",
      data: {
        run_id: run.id,
        artifact_type: artifact.artifact_type,
        name: artifact.name,
        ...(artifact.mime_type ? { mime_type: artifact.mime_type } : {}),
        ...(artifact.storage_bucket ? { storage_bucket: artifact.storage_bucket } : {}),
        ...(artifact.storage_path ? { storage_path: artifact.storage_path } : {}),
        ...(artifact.payload !== undefined ? { payload: artifact.payload } : {}),
        metadata: {
          ...normalizeObject(artifact.metadata),
          source: "workflow-run-processor",
        },
      },
    });
  }

  const completedAt = result.completed_at || new Date().toISOString();
  events.push({
    type: "workflow.run.state",
    data: {
      run_id: run.id,
      status: result.status,
      runtime_correlation_id: result.runtime_correlation_id,
      started_at: startedAt,
      ...(result.status === "canceled"
        ? { canceled_at: result.canceled_at || completedAt }
        : {}),
      ...(result.status !== "running" ? { completed_at: completedAt } : {}),
      ...(result.output_payload ? { output_payload: result.output_payload } : {}),
      ...(result.error_message ? { error_message: result.error_message } : {}),
      metadata: {
        ...normalizeObject(result.metadata),
        source: "workflow-run-processor",
      },
    },
  });

  return events;
}

async function emitLifecycleEvents(
  request: Request,
  run: QueuedRun,
  instance: RuntimeExecutionInstance,
  events: RuntimeLifecycleEvent[]
): Promise<void> {
  if (!instance.webhook_secret_encrypted) {
    throw new Error("Instance webhook secret is unavailable");
  }

  const secret = decrypt(instance.webhook_secret_encrypted);
  const webhookUrl = resolveWebhookUrl(request);

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const body = JSON.stringify(event);
    const timestamp = String(Date.now());
    const signature = createOpenClawSignature(body, timestamp, secret);
    const eventId = buildRuntimeEventId(run.id, event.type, index + 1);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-farmclaw-signature": signature,
        "x-farmclaw-timestamp": timestamp,
        "x-farmclaw-event-id": eventId,
        "x-farmclaw-instance-id": run.instance_id,
      },
      body,
      signal: AbortSignal.timeout(DEFAULT_WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(
        `Webhook emission failed (${response.status}): ${raw || "no response body"}`
      );
    }
  }
}

async function markRunFailedDirectly(
  run: QueuedRun,
  runMetadata: Record<string, unknown>,
  reasonCode: string,
  errorMessage: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();

  await admin
    .from("workflow_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: nowIso,
      metadata: {
        ...runMetadata,
        runtime_state: reasonCode,
        runtime_error: errorMessage,
        dispatch_processed_at: nowIso,
      },
    })
    .eq("id", run.id)
    .eq("instance_id", run.instance_id);

  await admin
    .from("workflow_run_steps")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: nowIso,
    })
    .eq("run_id", run.id)
    .eq("instance_id", run.instance_id)
    .in("status", ["pending", "running"]);
}

async function parseBody(request: Request): Promise<ProcessRunsBody> {
  try {
    const body = (await request.json()) as ProcessRunsBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseQueryParams(request: Request): ProcessRunsBody {
  try {
    const searchParams = new URL(request.url).searchParams;
    const batchSizeRaw = searchParams.get("batch_size");
    const batchSize = batchSizeRaw ? Number(batchSizeRaw) : undefined;

    return Number.isFinite(batchSize) ? { batch_size: batchSize } : {};
  } catch {
    return {};
  }
}

function createEmptyRunProcessTotals(): RunProcessTotals {
  return {
    dispatched: 0,
    failed: 0,
    skipped: 0,
    runtimeSucceeded: 0,
    runtimeFailed: 0,
    approvalBlocked: 0,
    approvalRejected: 0,
  };
}

async function isAuthorized(
  request: Request,
  options: AuthorizationOptions
): Promise<boolean> {
  const expectedTokens = [
    process.env.WORKFLOW_RUN_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-workflow-run-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  if (!options.allowSessionAuth) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!(user && isAdmin(user.email));
}

async function processRunsRequest(
  request: Request,
  options: { body: ProcessRunsBody; allowSessionAuth: boolean }
) {
  const authorized = await isAuthorized(request, {
    allowSessionAuth: options.allowSessionAuth,
  });

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batchSize = clampInt(
    options.body.batch_size,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE
  );

  const admin = createAdminClient();
  const { data: queuedData, error: queuedError } = await admin
    .from("workflow_runs")
    .select(
      "id, workflow_id, instance_id, customer_id, source_version, runtime_correlation_id, input_payload, metadata"
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (queuedError) {
    return NextResponse.json(
      { error: safeErrorMessage(queuedError, "Failed to load queued workflow runs") },
      { status: 500 }
    );
  }

  const queuedRuns = (queuedData || []) as QueuedRun[];
  if (queuedRuns.length === 0) {
    return NextResponse.json({
      claimed: 0,
      dispatched: 0,
      failed: 0,
      skipped: 0,
      approval_blocked: 0,
      approval_rejected: 0,
    });
  }

  const workflowIds = Array.from(new Set(queuedRuns.map((run) => run.workflow_id)));
  const sourceVersions = Array.from(
    new Set(
      queuedRuns
        .map((run) => run.source_version)
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  const runIds = queuedRuns.map((run) => run.id);
  const instanceIds = Array.from(new Set(queuedRuns.map((run) => run.instance_id)));

  const workflowStatesPromise = admin
    .from("workflow_definitions")
    .select("id, status, published_version")
    .in("id", workflowIds);

  const workflowVersionsPromise =
    sourceVersions.length > 0
      ? admin
          .from("workflow_versions")
          .select("workflow_id, version, graph")
          .in("workflow_id", workflowIds)
          .in("version", sourceVersions)
      : Promise.resolve({
          data: [] as WorkflowVersionSnapshot[],
          error: null as null,
        });

  const instancesPromise = admin
    .from("instances")
    .select("id, server_ip, channel_config, webhook_secret_encrypted")
    .in("id", instanceIds);

  const [
    { data: workflowStatesData, error: workflowStatesError },
    { data: workflowVersionData, error: workflowVersionError },
    { data: instanceRows, error: instanceError },
  ] = await Promise.all([
    workflowStatesPromise,
    workflowVersionsPromise,
    instancesPromise,
  ]);

  if (workflowStatesError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          workflowStatesError,
          "Failed to load workflow definition state"
        ),
      },
      { status: 500 }
    );
  }

  if (workflowVersionError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          workflowVersionError,
          "Failed to load workflow snapshots for queued runs"
        ),
      },
      { status: 500 }
    );
  }

  if (instanceError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          instanceError,
          "Failed to load instance metadata for workflow dispatch"
        ),
      },
      { status: 500 }
    );
  }

  const workflowStateById = new Map<string, WorkflowDefinitionState>(
    ((workflowStatesData || []) as WorkflowDefinitionState[]).map((workflow) => [
      workflow.id,
      workflow,
    ])
  );

  const workflowVersionByKey = new Map<string, WorkflowVersionSnapshot>(
    ((workflowVersionData || []) as WorkflowVersionSnapshot[]).map((row) => [
      `${row.workflow_id}:${row.version}`,
      row,
    ])
  );

  const instanceById = new Map<string, RuntimeExecutionInstance>(
    ((instanceRows || []) as RuntimeExecutionInstance[]).map((row) => [row.id, row])
  );

  const approvalCheckNowIso = new Date().toISOString();
  const { error: expireApprovalsError } = await admin
    .from("workflow_approvals")
    .update({
      status: "expired",
      expired_at: approvalCheckNowIso,
      decided_at: approvalCheckNowIso,
      decision_comment: "Approval SLA expired.",
    })
    .in("run_id", runIds)
    .eq("status", "pending")
    .lt("sla_due_at", approvalCheckNowIso);

  if (expireApprovalsError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          expireApprovalsError,
          "Failed to expire overdue workflow approvals"
        ),
      },
      { status: 500 }
    );
  }

  const { data: approvalRowsData, error: approvalRowsError } = await admin
    .from("workflow_approvals")
    .select("id, run_id, node_id, status")
    .in("run_id", runIds);

  if (approvalRowsError) {
    return NextResponse.json(
      {
        error: safeErrorMessage(
          approvalRowsError,
          "Failed to load workflow approvals for queued runs"
        ),
      },
      { status: 500 }
    );
  }

  const approvalsByRunId = new Map<
    string,
    Array<{ node_id: string; status: WorkflowApprovalStatus }>
  >();

  for (const row of (approvalRowsData || []) as WorkflowApprovalRow[]) {
    const current = approvalsByRunId.get(row.run_id) || [];
    current.push({
      node_id: row.node_id,
      status: normalizeApprovalStatus(row.status),
    });
    approvalsByRunId.set(row.run_id, current);
  }

  const processQueuedRun = async (run: QueuedRun): Promise<RunProcessTotals> => {
    const totals = createEmptyRunProcessTotals();
    const instance = instanceById.get(run.instance_id);
    const workflowState = workflowStateById.get(run.workflow_id);
    const workflowVersion = workflowVersionByKey.get(
      `${run.workflow_id}:${run.source_version}`
    );
    const runMetadata = normalizeObject(run.metadata);
    const nowIso = new Date().toISOString();

    try {
      if (
        !workflowState ||
        workflowState.status !== "published" ||
        !workflowState.published_version ||
        workflowState.published_version < run.source_version
      ) {
        const { data: failedRow, error: failUpdateError } = await admin
          .from("workflow_runs")
          .update({
            status: "failed",
            error_message:
              "Workflow is no longer runnable in its queued version. Re-publish and retry.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "dispatch_rejected",
              dispatch_error: "workflow_not_runnable",
              dispatch_processed_at: nowIso,
            },
          })
          .eq("id", run.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();

        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }

        totals.failed += 1;
        return totals;
      }

      if (!workflowVersion) {
        const { data: failedRow, error: failUpdateError } = await admin
          .from("workflow_runs")
          .update({
            status: "failed",
            error_message:
              "Workflow snapshot for queued run was not found. Re-publish and retry.",
            completed_at: nowIso,
            metadata: {
              ...runMetadata,
              runtime_state: "dispatch_rejected",
              dispatch_error: "workflow_snapshot_missing",
              dispatch_processed_at: nowIso,
            },
          })
          .eq("id", run.id)
          .eq("status", "queued")
          .select("id")
          .maybeSingle();

        if (failUpdateError || !failedRow) {
          totals.skipped += 1;
          return totals;
        }

        totals.failed += 1;
        return totals;
      }

      const approvalNodes = resolveWorkflowApprovalNodes(
        workflowVersion.graph,
        new Date(nowIso)
      );
      const requiredApprovalNodeIds = extractRequiredApprovalNodeIds(approvalNodes);

      if (requiredApprovalNodeIds.length > 0) {
        let runApprovals = approvalsByRunId.get(run.id) || [];
        let approvalGate = evaluateWorkflowRunApprovalGate(
          requiredApprovalNodeIds,
          runApprovals
        );

        if (approvalGate.missingNodeIds.length > 0) {
          const missingNodes = approvalNodes.filter((node) =>
            approvalGate.missingNodeIds.includes(node.node_id)
          );

          if (missingNodes.length > 0) {
            const { error: missingApprovalInsertError } = await admin
              .from("workflow_approvals")
              .upsert(
                buildWorkflowApprovalInsertRows({
                  runId: run.id,
                  workflowId: run.workflow_id,
                  instanceId: run.instance_id,
                  customerId: run.customer_id,
                  approvalNodes: missingNodes,
                  source: "processor_backfill",
                }),
                {
                  onConflict: "run_id,node_id",
                  ignoreDuplicates: true,
                }
              );

            if (missingApprovalInsertError) {
              totals.skipped += 1;
              return totals;
            }

            runApprovals = [
              ...runApprovals,
              ...missingNodes.map((node) => ({
                node_id: node.node_id,
                status: "pending" as WorkflowApprovalStatus,
              })),
            ];
            approvalsByRunId.set(run.id, runApprovals);
            approvalGate = evaluateWorkflowRunApprovalGate(
              requiredApprovalNodeIds,
              runApprovals
            );
          }
        }

        const approvalGateMetadata = {
          required: requiredApprovalNodeIds.length,
          missing: approvalGate.missingNodeIds.length,
          pending: approvalGate.pendingNodeIds.length,
          approved: approvalGate.approvedNodeIds.length,
          rejected: approvalGate.rejectedNodeIds.length,
          checked_at: nowIso,
        };

        if (approvalGate.hasTerminalRejection) {
          const { data: rejectedRow, error: rejectUpdateError } = await admin
            .from("workflow_runs")
            .update({
              status: "approval_rejected",
              error_message: "Workflow run rejected during approval.",
              completed_at: nowIso,
              metadata: {
                ...runMetadata,
                runtime_state: "approval_rejected",
                approval_gate: approvalGateMetadata,
                approval_rejected_at: nowIso,
                dispatch_processed_at: nowIso,
              },
            })
            .eq("id", run.id)
            .eq("status", "queued")
            .select("id")
            .maybeSingle();

          if (rejectUpdateError || !rejectedRow) {
            totals.skipped += 1;
            return totals;
          }

          await admin
            .from("workflow_run_steps")
            .update({
              status: "canceled",
              completed_at: nowIso,
              error_message: "Workflow run rejected during approval.",
            })
            .eq("run_id", run.id)
            .eq("instance_id", run.instance_id)
            .in("status", ["pending", "running"]);

          totals.approvalRejected += 1;

          auditLog({
            action: "workflow.run.approval_rejected",
            actor: "workflow-run-processor",
            resource_type: "workflow_run",
            resource_id: run.id,
            details: {
              customer_id: run.customer_id,
              instance_id: run.instance_id,
              workflow_id: run.workflow_id,
              approval_gate: approvalGateMetadata,
            },
          });

          return totals;
        }

        if (!approvalGate.readyToDispatch) {
          const { data: waitingRow, error: waitingUpdateError } = await admin
            .from("workflow_runs")
            .update({
              status: "awaiting_approval",
              metadata: {
                ...runMetadata,
                runtime_state: "awaiting_approval",
                approval_gate: approvalGateMetadata,
                approval_waiting_at: nowIso,
                dispatch_processed_at: nowIso,
              },
            })
            .eq("id", run.id)
            .eq("status", "queued")
            .select("id")
            .maybeSingle();

          if (waitingUpdateError || !waitingRow) {
            totals.skipped += 1;
            return totals;
          }

          totals.approvalBlocked += 1;

          auditLog({
            action: "workflow.run.awaiting_approval",
            actor: "workflow-run-processor",
            resource_type: "workflow_run",
            resource_id: run.id,
            details: {
              customer_id: run.customer_id,
              instance_id: run.instance_id,
              workflow_id: run.workflow_id,
              approval_gate: approvalGateMetadata,
            },
          });

          return totals;
        }
      }

      if (!instance) {
        await markRunFailedDirectly(
          run,
          runMetadata,
          "dispatch_instance_missing",
          "Instance metadata not found for workflow runtime dispatch."
        );
        totals.failed += 1;
        return totals;
      }

      const runtimeCorrelationId = run.runtime_correlation_id || run.id;

      const { data: dispatchedRow, error: dispatchError } = await admin
        .from("workflow_runs")
        .update({
          status: "running",
          started_at: nowIso,
          runtime_correlation_id: runtimeCorrelationId,
          metadata: {
            ...runMetadata,
            runtime_state: "dispatched",
            dispatch_processed_at: nowIso,
            dispatch_processor: "api/admin/workflows/process-runs",
            dispatch_mode: "gateway_worker",
          },
        })
        .eq("id", run.id)
        .eq("status", "queued")
        .select("id")
        .maybeSingle();

      if (dispatchError || !dispatchedRow) {
        totals.skipped += 1;
        return totals;
      }

      await admin
        .from("workflow_run_steps")
        .update({
          status: "running",
          started_at: nowIso,
        })
        .eq("run_id", run.id)
        .eq("instance_id", run.instance_id)
        .eq("status", "pending")
        .eq("step_index", 0);

      totals.dispatched += 1;

      auditLog({
        action: "workflow.run.dispatched",
        actor: "workflow-run-processor",
        resource_type: "workflow_run",
        resource_id: run.id,
        details: {
          customer_id: run.customer_id,
          instance_id: run.instance_id,
          workflow_id: run.workflow_id,
          source_version: run.source_version,
        },
      });

      let executionResult: WorkflowWorkerExecutionResult;
      try {
        executionResult = await invokeWorkflowRuntimeWorker(
          instance,
          run,
          runtimeCorrelationId,
          nowIso
        );
      } catch (error) {
        executionResult = buildRuntimeFailureResult(
          runtimeCorrelationId,
          nowIso,
          `Runtime invocation failed: ${errorToMessage(error)}`
        );
      }

      const lifecycleEvents = buildLifecycleEvents(run, nowIso, executionResult);
      try {
        await emitLifecycleEvents(request, run, instance, lifecycleEvents);
      } catch (error) {
        await markRunFailedDirectly(
          run,
          runMetadata,
          "dispatch_webhook_emit_failed",
          `Runtime webhook emission failed: ${errorToMessage(error)}`
        );
        totals.failed += 1;
        totals.runtimeFailed += 1;
        return totals;
      }

      if (executionResult.status === "succeeded") {
        totals.runtimeSucceeded += 1;
      } else {
        totals.runtimeFailed += 1;
      }

      auditLog({
        action:
          executionResult.status === "succeeded"
            ? "workflow.run.runtime_succeeded"
            : "workflow.run.runtime_failed",
        actor: "workflow-run-processor",
        resource_type: "workflow_run",
        resource_id: run.id,
        details: {
          customer_id: run.customer_id,
          instance_id: run.instance_id,
          workflow_id: run.workflow_id,
          status: executionResult.status,
          runtime_correlation_id: executionResult.runtime_correlation_id,
        },
      });

      return totals;
    } catch (error) {
      totals.skipped += 1;

      auditLog({
        action: "workflow.run.dispatch_error",
        actor: "workflow-run-processor",
        resource_type: "workflow_run",
        resource_id: run.id,
        details: {
          customer_id: run.customer_id,
          instance_id: run.instance_id,
          workflow_id: run.workflow_id,
          error_message: errorToMessage(error),
        },
      });

      return totals;
    }
  };

  const aggregateTotals = createEmptyRunProcessTotals();

  for (let index = 0; index < queuedRuns.length; index += RUN_PROCESS_CONCURRENCY) {
    const batch = queuedRuns.slice(index, index + RUN_PROCESS_CONCURRENCY);
    const settledBatch = await Promise.allSettled(batch.map((run) => processQueuedRun(run)));

    for (const result of settledBatch) {
      const rowTotals =
        result.status === "fulfilled"
          ? result.value
          : {
              ...createEmptyRunProcessTotals(),
              skipped: 1,
            };

      aggregateTotals.dispatched += rowTotals.dispatched;
      aggregateTotals.failed += rowTotals.failed;
      aggregateTotals.skipped += rowTotals.skipped;
      aggregateTotals.runtimeSucceeded += rowTotals.runtimeSucceeded;
      aggregateTotals.runtimeFailed += rowTotals.runtimeFailed;
      aggregateTotals.approvalBlocked += rowTotals.approvalBlocked;
      aggregateTotals.approvalRejected += rowTotals.approvalRejected;
    }
  }

  return NextResponse.json({
    claimed: queuedRuns.length,
    dispatched: aggregateTotals.dispatched,
    failed: aggregateTotals.failed,
    skipped: aggregateTotals.skipped,
    runtime_succeeded: aggregateTotals.runtimeSucceeded,
    runtime_failed: aggregateTotals.runtimeFailed,
    approval_blocked: aggregateTotals.approvalBlocked,
    approval_rejected: aggregateTotals.approvalRejected,
  });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  return processRunsRequest(request, {
    body,
    allowSessionAuth: true,
  });
}

export async function GET(request: Request) {
  const body = parseQueryParams(request);
  return processRunsRequest(request, {
    body,
    allowSessionAuth: false,
  });
}
