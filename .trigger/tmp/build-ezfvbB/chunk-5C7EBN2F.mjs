import {
  safeErrorMessage
} from "./chunk-R2V4UDE3.mjs";
import {
  __name,
  init_esm
} from "./chunk-262SQFPS.mjs";

// src/lib/runtime/tenant-runtime-queue.ts
init_esm();

// src/lib/runtime/tenant-runtime-run-state.ts
init_esm();
var TRANSITIONS = {
  queued: {
    start: "running",
    cancel: "canceled"
  },
  running: {
    request_approval: "awaiting_approval",
    complete: "completed",
    fail: "failed",
    cancel: "canceled"
  },
  awaiting_approval: {
    resume_after_approval: "running",
    retry: "queued",
    fail: "failed",
    cancel: "canceled"
  },
  completed: {},
  failed: {
    retry: "queued",
    cancel: "canceled"
  },
  canceled: {}
};
function transitionTenantRuntimeRunState(current, event) {
  return TRANSITIONS[current][event] || null;
}
__name(transitionTenantRuntimeRunState, "transitionTenantRuntimeRunState");
function assertTenantRuntimeRunTransition(current, event) {
  const next = transitionTenantRuntimeRunState(current, event);
  if (!next) {
    throw new Error(`Invalid tenant runtime run transition: ${current} -> ${event}`);
  }
  return next;
}
__name(assertTenantRuntimeRunTransition, "assertTenantRuntimeRunTransition");

// src/lib/runtime/tenant-runtime-queue.ts
var TENANT_RUNTIME_RUN_SELECT = [
  "id",
  "tenant_id",
  "customer_id",
  "run_kind",
  "source",
  "status",
  "attempt_count",
  "max_attempts",
  "idempotency_key",
  "request_trace_id",
  "correlation_id",
  "payload",
  "result",
  "error_message",
  "queued_at",
  "started_at",
  "completed_at",
  "canceled_at",
  "lock_expires_at",
  "worker_id",
  "metadata",
  "created_at",
  "updated_at"
].join(", ");
var TenantRuntimeQueueError = class extends Error {
  static {
    __name(this, "TenantRuntimeQueueError");
  }
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
};
function sanitizeObject(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  return {};
}
__name(sanitizeObject, "sanitizeObject");
function mapRuntimeRunRow(row) {
  return {
    id: String(row.id || ""),
    tenant_id: String(row.tenant_id || ""),
    customer_id: String(row.customer_id || ""),
    run_kind: row.run_kind,
    source: row.source,
    status: row.status,
    attempt_count: Number(row.attempt_count || 0),
    max_attempts: Number(row.max_attempts || 0),
    idempotency_key: typeof row.idempotency_key === "string" ? row.idempotency_key : null,
    request_trace_id: typeof row.request_trace_id === "string" ? row.request_trace_id : null,
    correlation_id: typeof row.correlation_id === "string" ? row.correlation_id : null,
    payload: sanitizeObject(row.payload),
    result: sanitizeObject(row.result),
    error_message: typeof row.error_message === "string" ? row.error_message : null,
    queued_at: String(row.queued_at || ""),
    started_at: typeof row.started_at === "string" ? row.started_at : null,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    canceled_at: typeof row.canceled_at === "string" ? row.canceled_at : null,
    lock_expires_at: typeof row.lock_expires_at === "string" ? row.lock_expires_at : null,
    worker_id: typeof row.worker_id === "string" ? row.worker_id : null,
    metadata: sanitizeObject(row.metadata),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || "")
  };
}
__name(mapRuntimeRunRow, "mapRuntimeRunRow");
async function enqueueDiscordRuntimeRun(admin, input) {
  const { data, error } = await admin.from("tenant_runtime_runs").insert({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    run_kind: input.runKind,
    source: "discord_ingress",
    status: "queued",
    idempotency_key: input.idempotencyKey,
    request_trace_id: input.requestTraceId,
    correlation_id: input.idempotencyKey,
    payload: input.payload,
    metadata: input.metadata || {},
    queued_at: (/* @__PURE__ */ new Date()).toISOString()
  }).select(TENANT_RUNTIME_RUN_SELECT).single();
  if (error && error.code === "23505") {
    const { data: existing, error: existingError } = await admin.from("tenant_runtime_runs").select(TENANT_RUNTIME_RUN_SELECT).eq("tenant_id", input.tenantId).eq("run_kind", input.runKind).eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (existingError || !existing) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(existingError, "Failed to resolve duplicate tenant runtime run")
      );
    }
    return mapRuntimeRunRow(existing);
  }
  if (error || !data) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to enqueue tenant runtime run")
    );
  }
  return mapRuntimeRunRow(data);
}
__name(enqueueDiscordRuntimeRun, "enqueueDiscordRuntimeRun");
async function enqueueEmailRuntimeRun(admin, input) {
  const { data, error } = await admin.from("tenant_runtime_runs").insert({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    run_kind: "email_runtime",
    source: "email_ingress",
    status: "queued",
    idempotency_key: input.idempotencyKey,
    request_trace_id: input.requestTraceId,
    correlation_id: input.idempotencyKey,
    payload: input.payload,
    metadata: input.metadata || {},
    queued_at: (/* @__PURE__ */ new Date()).toISOString()
  }).select(TENANT_RUNTIME_RUN_SELECT).single();
  if (error && error.code === "23505") {
    const { data: existing, error: existingError } = await admin.from("tenant_runtime_runs").select(TENANT_RUNTIME_RUN_SELECT).eq("tenant_id", input.tenantId).eq("run_kind", "email_runtime").eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (existingError || !existing) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(existingError, "Failed to resolve duplicate email runtime run")
      );
    }
    return mapRuntimeRunRow(existing);
  }
  if (error || !data) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to enqueue email runtime run")
    );
  }
  return mapRuntimeRunRow(data);
}
__name(enqueueEmailRuntimeRun, "enqueueEmailRuntimeRun");
async function claimTenantRuntimeRuns(admin, input) {
  const leaseSeconds = input.leaseSeconds ?? 90;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const lockExpiresAt = new Date(Date.now() + leaseSeconds * 1e3).toISOString();
  let query = admin.from("tenant_runtime_runs").select(TENANT_RUNTIME_RUN_SELECT).eq("status", "queued").or(`lock_expires_at.is.null,lock_expires_at.lt.${nowIso}`).order("queued_at", { ascending: true }).limit(input.limit);
  if (input.runKind) {
    query = query.eq("run_kind", input.runKind);
  }
  const { data, error } = await query;
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to read queued tenant runtime runs")
    );
  }
  const rows = (data || []).map(mapRuntimeRunRow);
  if (rows.length === 0) {
    return [];
  }
  const claims = [];
  for (const row of rows) {
    const next = assertTenantRuntimeRunTransition(row.status, "start");
    const { data: claimed, error: claimError } = await admin.from("tenant_runtime_runs").update({
      status: next,
      started_at: (/* @__PURE__ */ new Date()).toISOString(),
      worker_id: input.workerId,
      lock_expires_at: lockExpiresAt,
      attempt_count: row.attempt_count + 1
    }).eq("id", row.id).eq("status", row.status).select(TENANT_RUNTIME_RUN_SELECT).maybeSingle();
    if (claimError) {
      throw new TenantRuntimeQueueError(
        500,
        safeErrorMessage(claimError, "Failed to claim tenant runtime run")
      );
    }
    if (!claimed) {
      continue;
    }
    claims.push({
      run: mapRuntimeRunRow(claimed),
      previousStatus: row.status
    });
  }
  return claims;
}
__name(claimTenantRuntimeRuns, "claimTenantRuntimeRuns");
async function getTenantRuntimeRunById(admin, runId) {
  const { data, error } = await admin.from("tenant_runtime_runs").select(TENANT_RUNTIME_RUN_SELECT).eq("id", runId).maybeSingle();
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant runtime run")
    );
  }
  if (!data) {
    return null;
  }
  return mapRuntimeRunRow(data);
}
__name(getTenantRuntimeRunById, "getTenantRuntimeRunById");
async function transitionTenantRuntimeRun(admin, run, event, options) {
  const nextStatus = assertTenantRuntimeRunTransition(run.status, event);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updates = {
    status: nextStatus,
    result: options?.result || run.result,
    error_message: options?.errorMessage || null,
    worker_id: options?.workerId === void 0 ? run.worker_id : options.workerId,
    lock_expires_at: options?.lockExpiresAt === void 0 ? null : options.lockExpiresAt,
    metadata: {
      ...run.metadata,
      ...options?.metadataPatch || {},
      last_transition_event: event,
      last_transition_at: nowIso
    }
  };
  if (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "canceled") {
    updates.completed_at = nowIso;
  }
  if (nextStatus === "queued") {
    updates.queued_at = options?.queuedAt || nowIso;
    updates.started_at = null;
    updates.completed_at = null;
    updates.canceled_at = null;
    if (options?.workerId === void 0) {
      updates.worker_id = null;
    }
  }
  if (nextStatus === "canceled") {
    updates.canceled_at = nowIso;
  }
  const { data, error } = await admin.from("tenant_runtime_runs").update(updates).eq("id", run.id).eq("status", run.status).select(TENANT_RUNTIME_RUN_SELECT).maybeSingle();
  if (error) {
    throw new TenantRuntimeQueueError(
      500,
      safeErrorMessage(error, "Failed to transition tenant runtime run")
    );
  }
  if (!data) {
    throw new TenantRuntimeQueueError(
      409,
      "Tenant runtime run transition lost optimistic lock"
    );
  }
  return mapRuntimeRunRow(data);
}
__name(transitionTenantRuntimeRun, "transitionTenantRuntimeRun");

// src/lib/ai/agent-resolver.ts
init_esm();
async function resolveAgentForChannel(admin, tenantId, channelId) {
  const { data: boundAgent, error: boundError } = await admin.from("tenant_agents").select("*").eq("tenant_id", tenantId).eq("status", "active").eq("config->>discord_channel_id", channelId).maybeSingle();
  if (boundError) {
    throw new Error(`Failed to resolve agent for channel: ${boundError.message}`);
  }
  if (boundAgent) {
    return boundAgent;
  }
  return resolveDefaultAgent(admin, tenantId);
}
__name(resolveAgentForChannel, "resolveAgentForChannel");
async function resolveDefaultAgent(admin, tenantId) {
  const { data, error } = await admin.from("tenant_agents").select("*").eq("tenant_id", tenantId).eq("status", "active").eq("is_default", true).maybeSingle();
  if (error) {
    throw new Error(`Failed to resolve default agent: ${error.message}`);
  }
  if (data) {
    return data;
  }
  const { data: firstAgent, error: firstError } = await admin.from("tenant_agents").select("*").eq("tenant_id", tenantId).eq("status", "active").order("sort_order", { ascending: true }).limit(1).maybeSingle();
  if (firstError) {
    throw new Error(`Failed to resolve any agent: ${firstError.message}`);
  }
  return firstAgent;
}
__name(resolveDefaultAgent, "resolveDefaultAgent");

// src/lib/ai/message-store.ts
init_esm();
async function storeInboundMessage(admin, input) {
  const { data, error } = await admin.from("tenant_messages").insert({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    session_id: input.sessionId,
    direction: "inbound",
    author_type: "user",
    author_id: input.discordUserId,
    content_text: input.content,
    content_json: {},
    source_event_id: input.sourceEventId
  }).select("*").single();
  if (error) {
    throw new Error(`Failed to store inbound message: ${error.message}`);
  }
  return data;
}
__name(storeInboundMessage, "storeInboundMessage");
async function storeOutboundMessage(admin, input) {
  const contentJson = {};
  if (input.toolCalls && input.toolCalls.length > 0) {
    contentJson.tool_calls = input.toolCalls;
  }
  const { data, error } = await admin.from("tenant_messages").insert({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    session_id: input.sessionId,
    direction: "outbound",
    author_type: "agent",
    author_id: input.agentId,
    content_text: input.content,
    content_json: contentJson,
    token_count: input.tokenCount
  }).select("*").single();
  if (error) {
    throw new Error(`Failed to store outbound message: ${error.message}`);
  }
  return data;
}
__name(storeOutboundMessage, "storeOutboundMessage");

// src/lib/ai/session-resolver.ts
init_esm();
async function resolveSession(admin, input) {
  const { data: existing, error: findError } = await admin.from("tenant_sessions").select("*").eq("tenant_id", input.tenantId).eq("external_id", input.channelId).eq("session_kind", input.sessionKind).eq("status", "active").maybeSingle();
  if (findError) {
    throw new Error(`Failed to resolve session: ${findError.message}`);
  }
  if (existing) {
    if (input.agentId && existing.agent_id !== input.agentId) {
      await admin.from("tenant_sessions").update({ agent_id: input.agentId, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", existing.id);
    }
    return existing;
  }
  const { data: created, error: createError } = await admin.from("tenant_sessions").insert({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    agent_id: input.agentId,
    session_kind: input.sessionKind,
    external_id: input.channelId,
    status: "active",
    metadata: {}
  }).select("*").single();
  if (createError) {
    if (createError.code === "23505") {
      const { data: raced } = await admin.from("tenant_sessions").select("*").eq("tenant_id", input.tenantId).eq("external_id", input.channelId).eq("session_kind", input.sessionKind).eq("status", "active").maybeSingle();
      if (raced) return raced;
    }
    throw new Error(`Failed to create session: ${createError.message}`);
  }
  return created;
}
__name(resolveSession, "resolveSession");

export {
  enqueueDiscordRuntimeRun,
  enqueueEmailRuntimeRun,
  claimTenantRuntimeRuns,
  getTenantRuntimeRunById,
  transitionTenantRuntimeRun,
  resolveAgentForChannel,
  resolveDefaultAgent,
  resolveSession,
  storeInboundMessage,
  storeOutboundMessage
};
//# sourceMappingURL=chunk-5C7EBN2F.mjs.map
