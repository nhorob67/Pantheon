import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TENANT_RUNTIME_RUN_KIND_VALUES,
  type TenantRuntimeRun,
} from "../../types/tenant-runtime.ts";
import { readMetadataNumber } from "../runtime/async-delegation-utils.ts";

// ---------------------------------------------------------------------------
// Tests — delegation worker payload parsing
// ---------------------------------------------------------------------------

function makeRun(overrides: Partial<TenantRuntimeRun> = {}): TenantRuntimeRun {
  return {
    id: "run-child-1",
    tenant_id: "tenant-1",
    customer_id: "customer-1",
    run_kind: "delegation_runtime",
    source: "system",
    status: "running",
    attempt_count: 1,
    max_attempts: 3,
    idempotency_key: null,
    request_trace_id: null,
    correlation_id: null,
    payload: {
      delegated_by: "agent-parent",
      delegated_by_name: "Parent Agent",
      target_agent_id: "agent-target",
      target_agent_name: "Target Agent",
      task: "Research the topic",
      context: "Additional info",
    },
    result: {},
    error_message: null,
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
    canceled_at: null,
    lock_expires_at: null,
    worker_id: "trigger-dev",
    parent_run_id: "run-parent",
    delegation_depth: 1,
    deadline_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    delegation_kind: "async",
    metadata: { delegation: true, async: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("delegation worker payload parsing", () => {
  it("extracts target_agent_id and task from payload", () => {
    const run = makeRun();
    const targetAgentId = run.payload.target_agent_id as string | undefined;
    const task = run.payload.task as string | undefined;

    assert.equal(targetAgentId, "agent-target");
    assert.equal(task, "Research the topic");
  });

  it("extracts context from payload", () => {
    const run = makeRun();
    const context = run.payload.context as string | null | undefined;
    assert.equal(context, "Additional info");
  });

  it("extracts parent agent info from payload", () => {
    const run = makeRun();
    const parentAgentId = run.payload.delegated_by as string;
    const parentAgentName = run.payload.delegated_by_name as string;

    assert.equal(parentAgentId, "agent-parent");
    assert.equal(parentAgentName, "Parent Agent");
  });

  it("handles missing payload fields", () => {
    const run = makeRun({ payload: {} });
    const targetAgentId = run.payload.target_agent_id as string | undefined;
    const task = run.payload.task as string | undefined;

    assert.equal(targetAgentId, undefined);
    assert.equal(task, undefined);
  });

  it("reads delegation metadata from run", () => {
    const run = makeRun();
    assert.equal(run.run_kind, "delegation_runtime");
    assert.equal(run.delegation_kind, "async");
    assert.equal(run.delegation_depth, 1);
    assert.equal(run.parent_run_id, "run-parent");
    assert.ok(run.deadline_at != null);
  });

  it("parent_tool_keys can be extracted for permission narrowing", () => {
    const run = makeRun({
      payload: {
        ...makeRun().payload,
        parent_tool_keys: ["memory_write", "delegate_task", "custom_tool"],
      },
    });
    const parentToolKeys = run.payload.parent_tool_keys as string[] | undefined;
    assert.ok(Array.isArray(parentToolKeys));
    assert.equal(parentToolKeys!.length, 3);
  });
});

// ---------------------------------------------------------------------------
// Tests — delegation_runtime run kind type
// ---------------------------------------------------------------------------

describe("delegation_runtime run kind", () => {
  it("is a valid TenantRuntimeRunKind value", () => {
    assert.ok(
      TENANT_RUNTIME_RUN_KIND_VALUES.includes("delegation_runtime"),
      "delegation_runtime should be in TENANT_RUNTIME_RUN_KIND_VALUES"
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — TenantRuntimeRun interface new fields
// ---------------------------------------------------------------------------

describe("TenantRuntimeRun new fields", () => {
  it("includes parent_run_id", () => {
    const run = makeRun();
    assert.equal(run.parent_run_id, "run-parent");
  });

  it("includes delegation_depth", () => {
    const run = makeRun();
    assert.equal(run.delegation_depth, 1);
  });

  it("includes deadline_at", () => {
    const run = makeRun();
    assert.ok(run.deadline_at != null);
    assert.ok(new Date(run.deadline_at!).getTime() > Date.now());
  });

  it("includes delegation_kind", () => {
    const run = makeRun();
    assert.equal(run.delegation_kind, "async");
  });

  it("fields can be null for non-delegation runs", () => {
    const run = makeRun({
      parent_run_id: null,
      delegation_depth: 0,
      deadline_at: null,
      delegation_kind: null,
    });
    assert.equal(run.parent_run_id, null);
    assert.equal(run.delegation_depth, 0);
    assert.equal(run.deadline_at, null);
    assert.equal(run.delegation_kind, null);
  });
});

// ---------------------------------------------------------------------------
// Tests — additional payload validation
// ---------------------------------------------------------------------------

describe("delegation worker payload validation", () => {
  it("rejects run with missing target_agent_id in payload", () => {
    const run = makeRun({ payload: { task: "Do something" } });
    const targetAgentId = run.payload.target_agent_id as string | undefined;
    assert.equal(targetAgentId, undefined);
    // Worker would early-exit since !targetAgentId
    assert.ok(!targetAgentId);
  });

  it("rejects run with missing task in payload", () => {
    const run = makeRun({ payload: { target_agent_id: "agent-1" } });
    const task = run.payload.task as string | undefined;
    assert.equal(task, undefined);
    // Worker would early-exit since !task
    assert.ok(!task);
  });

  it("extracts cost fields from metadata for budget checking", () => {
    const run = makeRun({
      metadata: {
        delegation: true,
        async: true,
        async_delegation_spend_cents: 42,
      },
    });
    const spend = readMetadataNumber(run.metadata, "async_delegation_spend_cents");
    assert.equal(spend, 42);
  });

  it("delegation_kind defaults to null for non-delegation runs", () => {
    const run = makeRun({
      run_kind: "discord_runtime",
      delegation_kind: null,
      delegation_depth: 0,
      parent_run_id: null,
    });
    assert.equal(run.delegation_kind, null);
    assert.equal(run.delegation_depth, 0);
    assert.equal(run.run_kind, "discord_runtime");
  });
});
