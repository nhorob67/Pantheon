import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOpenClawSignature } from "@/lib/webhooks/openclaw-signature";
import { openclawWebhookPayloadSchema } from "@/lib/validators/openclaw-webhook";
import { decrypt } from "@/lib/crypto";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type { WorkflowNodeType, WorkflowRunStatus } from "@/types/workflow";

export const runtime = "nodejs";

interface RuntimeRunRow {
  id: string;
  workflow_id: string;
  customer_id: string;
  status: string;
  metadata: unknown;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
}

interface RuntimeStepRow {
  id: string;
  metadata: unknown;
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function parseEventTimestamp(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function extractEventType(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "unknown";
  }

  const eventType = (payload as { type?: unknown }).type;
  if (typeof eventType !== "string" || eventType.trim().length === 0) {
    return "unknown";
  }

  return eventType;
}

async function markWebhookEventStatus(
  eventId: string,
  status: "processed" | "failed"
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("openclaw_webhook_events")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("event_id", eventId);
}

async function applyWorkflowRunStateEvent(
  instanceId: string,
  eventId: string,
  data: {
    run_id: string;
    status: WorkflowRunStatus;
    runtime_correlation_id?: string;
    started_at?: string;
    completed_at?: string;
    canceled_at?: string;
    output_payload?: Record<string, unknown>;
    error_message?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const admin = createAdminClient();
  const { data: run, error: runError } = await admin
    .from("workflow_runs")
    .select(
      "id, workflow_id, customer_id, status, metadata, error_message, started_at, completed_at, canceled_at"
    )
    .eq("id", data.run_id)
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (runError) {
    throw new Error(safeErrorMessage(runError, "Failed to load workflow run"));
  }

  if (!run) {
    throw new Error("Workflow run not found for state event.");
  }

  const typedRun = run as RuntimeRunRow;
  const nowIso = new Date().toISOString();
  const startedAt = parseEventTimestamp(data.started_at);
  const completedAt = parseEventTimestamp(data.completed_at);
  const canceledAt = parseEventTimestamp(data.canceled_at);

  const metadata = {
    ...normalizeObject(typedRun.metadata),
    ...(data.metadata || {}),
    last_runtime_event_id: eventId,
    last_runtime_event_type: "workflow.run.state",
    last_runtime_event_at: nowIso,
  };

  const updates: Record<string, unknown> = {
    status: data.status,
    metadata,
  };

  if (data.runtime_correlation_id !== undefined) {
    updates.runtime_correlation_id = data.runtime_correlation_id || null;
  }

  if (data.output_payload !== undefined) {
    updates.output_payload = data.output_payload;
  }

  if (data.error_message !== undefined) {
    updates.error_message = data.error_message || null;
  }

  if (data.status === "running" || data.status === "paused_waiting_approval") {
    updates.started_at = startedAt || typedRun.started_at || nowIso;
  }

  if (
    data.status === "succeeded" ||
    data.status === "failed" ||
    data.status === "approval_rejected"
  ) {
    updates.completed_at = completedAt || typedRun.completed_at || nowIso;
  }

  if (data.status === "canceled") {
    updates.canceled_at = canceledAt || typedRun.canceled_at || nowIso;
    updates.completed_at = completedAt || typedRun.completed_at || nowIso;
  }

  const { error: updateError } = await admin
    .from("workflow_runs")
    .update(updates)
    .eq("id", data.run_id)
    .eq("instance_id", instanceId);

  if (updateError) {
    throw new Error(safeErrorMessage(updateError, "Failed to update workflow run"));
  }
}

async function applyWorkflowRunStepStateEvent(
  instanceId: string,
  eventId: string,
  data: {
    run_id: string;
    step_id?: string;
    node_id: string;
    node_type: WorkflowNodeType;
    step_index: number;
    attempt: number;
    status: "pending" | "running" | "succeeded" | "failed" | "skipped" | "canceled";
    input_payload?: Record<string, unknown>;
    output_payload?: Record<string, unknown>;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const admin = createAdminClient();

  const { data: run, error: runError } = await admin
    .from("workflow_runs")
    .select(
      "id, workflow_id, customer_id, status, metadata, error_message, started_at, completed_at, canceled_at"
    )
    .eq("id", data.run_id)
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (runError) {
    throw new Error(safeErrorMessage(runError, "Failed to load workflow run"));
  }

  if (!run) {
    throw new Error("Workflow run not found for step event.");
  }

  const typedRun = run as RuntimeRunRow;
  const nowIso = new Date().toISOString();
  const startedAt = parseEventTimestamp(data.started_at);
  const completedAt = parseEventTimestamp(data.completed_at);

  let stepRecord: RuntimeStepRow | null = null;

  if (data.step_id) {
    const { data: existingById, error: existingByIdError } = await admin
      .from("workflow_run_steps")
      .select("id, metadata")
      .eq("id", data.step_id)
      .eq("run_id", data.run_id)
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (existingByIdError) {
      throw new Error(
        safeErrorMessage(existingByIdError, "Failed to load workflow run step")
      );
    }

    if (existingById) {
      stepRecord = existingById as RuntimeStepRow;
    }
  }

  if (!stepRecord) {
    const { data: existingByIndex, error: existingByIndexError } = await admin
      .from("workflow_run_steps")
      .select("id, metadata")
      .eq("run_id", data.run_id)
      .eq("instance_id", instanceId)
      .eq("step_index", data.step_index)
      .eq("attempt", data.attempt)
      .maybeSingle();

    if (existingByIndexError) {
      throw new Error(
        safeErrorMessage(existingByIndexError, "Failed to load workflow run step")
      );
    }

    if (existingByIndex) {
      stepRecord = existingByIndex as RuntimeStepRow;
    }
  }

  const stepMetadata = {
    ...normalizeObject(stepRecord?.metadata),
    ...(data.metadata || {}),
    last_runtime_event_id: eventId,
    last_runtime_event_type: "workflow.run.step.state",
    last_runtime_event_at: nowIso,
  };

  const isTerminalStepStatus =
    data.status === "succeeded" ||
    data.status === "failed" ||
    data.status === "skipped" ||
    data.status === "canceled";

  if (stepRecord) {
    const stepUpdates: Record<string, unknown> = {
      status: data.status,
      metadata: stepMetadata,
      node_id: data.node_id,
      node_type: data.node_type,
      step_index: data.step_index,
      attempt: data.attempt,
    };

    if (data.input_payload !== undefined) {
      stepUpdates.input_payload = data.input_payload;
    }

    if (data.output_payload !== undefined) {
      stepUpdates.output_payload = data.output_payload;
    }

    if (data.error_message !== undefined) {
      stepUpdates.error_message = data.error_message || null;
    }

    if (data.status === "running") {
      stepUpdates.started_at = startedAt || nowIso;
    }

    if (isTerminalStepStatus) {
      stepUpdates.completed_at = completedAt || nowIso;
    }

    const { error: updateStepError } = await admin
      .from("workflow_run_steps")
      .update(stepUpdates)
      .eq("id", stepRecord.id)
      .eq("instance_id", instanceId);

    if (updateStepError) {
      throw new Error(
        safeErrorMessage(updateStepError, "Failed to update workflow run step")
      );
    }
  } else {
    const insertStepPayload: Record<string, unknown> = {
      run_id: data.run_id,
      workflow_id: typedRun.workflow_id,
      instance_id: instanceId,
      customer_id: typedRun.customer_id,
      node_id: data.node_id,
      node_type: data.node_type,
      step_index: data.step_index,
      attempt: data.attempt,
      status: data.status,
      input_payload: data.input_payload || {},
      output_payload: data.output_payload || null,
      error_message: data.error_message || null,
      metadata: stepMetadata,
    };

    if (data.step_id) {
      insertStepPayload.id = data.step_id;
    }

    if (data.status === "running") {
      insertStepPayload.started_at = startedAt || nowIso;
    }

    if (isTerminalStepStatus) {
      insertStepPayload.completed_at = completedAt || nowIso;
    }

    const { error: insertStepError } = await admin
      .from("workflow_run_steps")
      .insert(insertStepPayload);

    if (insertStepError) {
      throw new Error(
        safeErrorMessage(insertStepError, "Failed to insert workflow run step")
      );
    }
  }

  const runMetadata = {
    ...normalizeObject(typedRun.metadata),
    last_runtime_event_id: eventId,
    last_runtime_event_type: "workflow.run.step.state",
    last_runtime_event_at: nowIso,
  };

  const runUpdates: Record<string, unknown> = {
    metadata: runMetadata,
  };

  if (typedRun.status === "queued" && data.status === "running") {
    runUpdates.status = "running";
    runUpdates.started_at = typedRun.started_at || startedAt || nowIso;
  }

  if (
    data.status === "failed" &&
    typedRun.status !== "failed" &&
    typedRun.status !== "succeeded" &&
    typedRun.status !== "approval_rejected" &&
    typedRun.status !== "canceled"
  ) {
    runUpdates.status = "failed";
    runUpdates.error_message =
      data.error_message || typedRun.error_message || "Workflow run step failed.";
    runUpdates.completed_at = typedRun.completed_at || nowIso;
  }

  if (
    data.status === "canceled" &&
    (typedRun.status === "running" || typedRun.status === "cancel_requested")
  ) {
    runUpdates.status = "canceled";
    runUpdates.canceled_at = typedRun.canceled_at || nowIso;
    runUpdates.completed_at = typedRun.completed_at || nowIso;
  }

  const { error: updateRunError } = await admin
    .from("workflow_runs")
    .update(runUpdates)
    .eq("id", data.run_id)
    .eq("instance_id", instanceId);

  if (updateRunError) {
    throw new Error(
      safeErrorMessage(updateRunError, "Failed to update workflow run after step event")
    );
  }
}

async function applyWorkflowRunArtifactEvent(
  instanceId: string,
  eventId: string,
  data: {
    run_id: string;
    step_id?: string;
    artifact_type: string;
    name: string;
    mime_type?: string;
    storage_bucket?: string;
    storage_path?: string;
    payload?: unknown;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const admin = createAdminClient();

  const { data: run, error: runError } = await admin
    .from("workflow_runs")
    .select("id, workflow_id, customer_id")
    .eq("id", data.run_id)
    .eq("instance_id", instanceId)
    .maybeSingle();

  if (runError) {
    throw new Error(safeErrorMessage(runError, "Failed to load workflow run"));
  }

  if (!run) {
    throw new Error("Workflow run not found for artifact event.");
  }

  let stepId: string | null = null;
  if (data.step_id) {
    const { data: step, error: stepError } = await admin
      .from("workflow_run_steps")
      .select("id")
      .eq("id", data.step_id)
      .eq("run_id", data.run_id)
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (stepError) {
      throw new Error(
        safeErrorMessage(stepError, "Failed to load workflow run step")
      );
    }

    if (!step) {
      throw new Error("Workflow run step not found for artifact event.");
    }

    stepId = step.id;
  }

  const { error: insertError } = await admin.from("workflow_run_artifacts").insert({
    run_id: data.run_id,
    step_id: stepId,
    workflow_id: run.workflow_id,
    instance_id: instanceId,
    customer_id: run.customer_id,
    artifact_type: data.artifact_type,
    name: data.name,
    mime_type: data.mime_type || null,
    storage_bucket: data.storage_bucket || null,
    storage_path: data.storage_path || null,
    payload: data.payload === undefined ? null : data.payload,
    metadata: {
      ...(data.metadata || {}),
      last_runtime_event_id: eventId,
      last_runtime_event_type: "workflow.run.artifact",
      last_runtime_event_at: new Date().toISOString(),
    },
  });

  if (insertError) {
    throw new Error(
      safeErrorMessage(insertError, "Failed to insert workflow run artifact")
    );
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-farmclaw-signature");
  const timestamp = request.headers.get("x-farmclaw-timestamp");
  const eventId = request.headers.get("x-farmclaw-event-id");
  const instanceId = request.headers.get("x-farmclaw-instance-id");

  if (!instanceId || !eventId) {
    return NextResponse.json(
      { error: "Missing required headers" },
      { status: 400 }
    );
  }

  const body = await request.text();
  const admin = createAdminClient();

  // Look up instance and its webhook secret
  const { data: instance } = await admin
    .from("instances")
    .select("id, customer_id, webhook_secret_encrypted")
    .eq("id", instanceId)
    .single();

  if (!instance || !instance.webhook_secret_encrypted) {
    return NextResponse.json(
      { error: "Instance not found or webhook not configured" },
      { status: 404 }
    );
  }

  let secret: string;
  try {
    secret = decrypt(instance.webhook_secret_encrypted);
  } catch {
    return NextResponse.json(
      { error: "Webhook secret decryption failed" },
      { status: 500 }
    );
  }

  if (!verifyOpenClawSignature(body, signature, timestamp, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const rawEventType = extractEventType(payload);

  // Idempotency check
  const { error: idempotencyError } = await admin
    .from("openclaw_webhook_events")
    .insert({
      event_id: eventId,
      instance_id: instanceId,
      event_type: rawEventType,
      status: "processing",
    });

  if (idempotencyError) {
    if (idempotencyError.code === "23505") {
      // Duplicate event — already processed or in progress
      return NextResponse.json({ status: "duplicate" });
    }
    return NextResponse.json(
      { error: "Idempotency check failed" },
      { status: 500 }
    );
  }

  const parsed = openclawWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    await markWebhookEventStatus(eventId, "failed");

    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.type === "conversation.activity") {
      const { data } = parsed.data;

      // Atomic upsert via RPC
      await admin.rpc("upsert_conversation_event", {
        p_customer_id: instance.customer_id,
        p_instance_id: instanceId,
        p_agent_key: data.agent_key || null,
        p_date: data.date,
        p_message_count: data.user_messages + data.assistant_messages,
        p_user_message_count: data.user_messages,
        p_assistant_message_count: data.assistant_messages,
        p_conversation_count: data.conversations_started,
      });
    }

    if (parsed.data.type === "workflow.run.state") {
      await applyWorkflowRunStateEvent(instanceId, eventId, parsed.data.data);
    }

    if (parsed.data.type === "workflow.run.step.state") {
      await applyWorkflowRunStepStateEvent(instanceId, eventId, parsed.data.data);
    }

    if (parsed.data.type === "workflow.run.artifact") {
      await applyWorkflowRunArtifactEvent(instanceId, eventId, parsed.data.data);
    }

    await markWebhookEventStatus(eventId, "processed");

    return NextResponse.json({ status: "ok", event_type: parsed.data.type });
  } catch (err) {
    await markWebhookEventStatus(eventId, "failed");

    return NextResponse.json(
      { error: safeErrorMessage(err, "Webhook processing failed") },
      { status: 500 }
    );
  }
}
