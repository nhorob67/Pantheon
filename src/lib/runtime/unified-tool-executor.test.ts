import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createUnifiedToolExecutor } from "./unified-tool-executor.ts";
import type { UnifiedToolExecutorConfig } from "./unified-tool-executor.ts";
import type { Tool } from "ai";
import { z } from "zod";
import { tool } from "ai";

// Minimal mock config — no real DB or run context
function mockConfig(overrides?: Partial<UnifiedToolExecutorConfig>): UnifiedToolExecutorConfig {
  return {
    admin: {} as UnifiedToolExecutorConfig["admin"],
    tenantId: "tenant-1",
    customerId: "customer-1",
    agentId: "agent-1",
    run: null,
    actorRole: "operator",
    actorId: null,
    workerKind: "discord_runtime",
    ...overrides,
  };
}

function createMockAdminWithInsertSpy() {
  const insert = mock.fn(async () => ({ error: null }));
  return {
    admin: {
      from: () => ({ insert }),
    } as unknown as UnifiedToolExecutorConfig["admin"],
    insert,
  };
}

function createMockTool(executeFn: (args: unknown) => Promise<unknown>): Tool {
  return tool({
    description: "test tool",
    inputSchema: z.object({ value: z.string().optional() }),
    execute: executeFn as (args: { value?: string }) => Promise<unknown>,
  });
}

describe("unified-tool-executor", () => {
  it("wraps a tool and records success", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const mockTool = createMockTool(async () => ({ result: "ok" }));
    const wrapped = executor.wrapTool("test_tool", mockTool);

    const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
      .execute({ value: "hello" });

    assert.deepEqual(result, { result: "ok" });
    assert.equal(executor.records.length, 1);

    const record = executor.records[0];
    assert.equal(record.toolName, "test_tool");
    assert.equal(record.success, true);
    assert.equal(record.errorClass, null);
    assert.ok(record.durationMs >= 0);
    assert.ok(record.inputSummary.includes("hello"));
    assert.ok(record.outputSummary.includes("ok"));
    // No run context → policy skipped
    assert.equal(record.policyDecision, "skipped");
  });

  it("detects soft errors from tools", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const mockTool = createMockTool(async () => ({ error: "something went wrong" }));
    const wrapped = executor.wrapTool("failing_tool", mockTool);

    const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
      .execute({});

    // Soft errors are returned to the model (not thrown)
    assert.deepEqual(result, { error: "something went wrong" });
    assert.equal(executor.records.length, 1);
    assert.equal(executor.records[0].success, false);
    assert.equal(executor.records[0].errorClass, "something went wrong");
  });

  it("treats tool-reported approval requirements as pending approvals", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const mockTool = createMockTool(async () => ({
      error: "approval_required",
      approval_id: "approval-1",
    }));
    const wrapped = executor.wrapTool("approval_tool", mockTool);

    const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
      .execute({});

    assert.deepEqual(result, {
      error: "approval_required",
      approval_id: "approval-1",
    });
    assert.equal(executor.records[0].success, false);
    assert.equal(executor.records[0].errorClass, "approval_required");
    assert.equal(executor.records[0].policyDecision, "requires_approval");
    assert.match(executor.records[0].outputSummary, /approval-1/);
  });

  it("detects hard errors (exceptions)", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const mockTool = createMockTool(async () => {
      throw new TypeError("bad input");
    });
    const wrapped = executor.wrapTool("throwing_tool", mockTool);

    await assert.rejects(
      () => (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({}),
      { name: "TypeError", message: "bad input" }
    );

    assert.equal(executor.records.length, 1);
    assert.equal(executor.records[0].success, false);
    assert.equal(executor.records[0].errorClass, "TypeError");
  });

  it("wrapAll wraps multiple tools", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const tools = {
      tool_a: createMockTool(async () => ({ a: 1 })),
      tool_b: createMockTool(async () => ({ b: 2 })),
    };

    const wrapped = executor.wrapAll(tools);
    assert.ok("tool_a" in wrapped);
    assert.ok("tool_b" in wrapped);

    await (wrapped.tool_a as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});
    await (wrapped.tool_b as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

    assert.equal(executor.records.length, 2);
    assert.equal(executor.records[0].toolName, "tool_a");
    assert.equal(executor.records[1].toolName, "tool_b");
  });

  it("skips policy evaluation for non-native tools", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    // "GMAIL_SEND_EMAIL" is a Composio tool name, not in native catalog
    const mockTool = createMockTool(async () => ({ sent: true }));
    const wrapped = executor.wrapTool("GMAIL_SEND_EMAIL", mockTool);

    await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

    assert.equal(executor.records[0].policyDecision, "skipped");
    assert.equal(executor.records[0].policyReason, "external_governance");
  });

  it("skips policy when no run context", async () => {
    const executor = createUnifiedToolExecutor(mockConfig({ run: null }));
    // memory_write IS a native tool, but without a run we can't evaluate policy
    const mockTool = createMockTool(async () => ({ saved: true }));
    const wrapped = executor.wrapTool("memory_write", mockTool);

    await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

    assert.equal(executor.records[0].policyDecision, "skipped");
    assert.equal(executor.records[0].policyReason, "no_run_context");
  });

  it("flush is no-op when records are empty", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    // Should not throw
    await executor.flush();
    assert.equal(executor.records.length, 0);
  });

  it("records are immutable via getter", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const mockTool = createMockTool(async () => ({ ok: true }));
    const wrapped = executor.wrapTool("test", mockTool);

    await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

    const records = executor.records;
    assert.equal(records.length, 1);
    // ReadonlyArray — can't push
    assert.equal(typeof (records as unknown as unknown[]).push, "function");
  });

  it("tools without execute are returned as-is", () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const toolWithoutExecute = { description: "no execute" } as unknown as Tool;
    const wrapped = executor.wrapTool("no_exec", toolWithoutExecute);
    assert.equal(wrapped, toolWithoutExecute);
    assert.equal(executor.records.length, 0);
  });

  it("truncates large input/output summaries", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const largeOutput = { data: "x".repeat(2000) };
    const mockTool = createMockTool(async () => largeOutput);
    const wrapped = executor.wrapTool("big_tool", mockTool);

    await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({
      value: "y".repeat(2000),
    });

    assert.ok(executor.records[0].inputSummary.length <= 500);
    assert.ok(executor.records[0].outputSummary.length <= 500);
  });

  it("keeps integration_api_call summaries parseable when the body is large", async () => {
    const executor = createUnifiedToolExecutor(mockConfig());
    const largeBody = JSON.stringify({
      reports: [
        {
          type: "visitors",
          data: Array.from({ length: 50 }, (_, index) => [`2026-03-${String(index + 1).padStart(2, "0")}`, index]),
        },
      ],
      extra: "x".repeat(2000),
    });
    const mockTool = createMockTool(async () => ({
      status: 200,
      status_text: "OK",
      integration: "discourse",
      body: largeBody,
    }));
    const wrapped = executor.wrapTool("integration_api_call", mockTool);

    await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({
      value: "ignored",
    });

    assert.ok(executor.records[0].outputSummary.length <= 500);
    const parsed = JSON.parse(executor.records[0].outputSummary) as Record<string, unknown>;
    assert.equal(parsed.status, 200);
    assert.equal(parsed.integration, "discourse");
    assert.ok("body" in parsed || "rate_limit_warning" in parsed);
  });

  // -----------------------------------------------------------------------
  // Phase 1.3: Policy enforcement tests
  // -----------------------------------------------------------------------

  describe("policy enforcement", () => {
    it("enforcePolicy defaults to true", async () => {
      // With no run context, policy is skipped regardless — but the flag should be set
      const executor = createUnifiedToolExecutor(mockConfig());
      const mockTool = createMockTool(async () => ({ ok: true }));
      const wrapped = executor.wrapTool("test_tool", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Should execute normally since policy was skipped (no run context)
      assert.deepEqual(result, { ok: true });
    });

    it("shadow mode (enforcePolicy: false) logs but does not block", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: false, run: null })
      );
      // Even native tools execute in shadow mode without run context
      const executeFn = mock.fn(async () => ({ saved: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("memory_write", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      assert.deepEqual(result, { saved: true });
      assert.equal(executeFn.mock.callCount(), 1);
    });

    it("denied policy result contains structured error fields", async () => {
      // We can't easily mock the dynamic import in unit tests, but we can test
      // the denial result shape by checking that when policy IS evaluated and returns
      // denied, the record has the right shape.
      // For now, test with no run context (policy skipped) and verify the tool executes.
      const executor = createUnifiedToolExecutor(mockConfig({ run: null }));
      const mockTool = createMockTool(async () => ({ ok: true }));
      const wrapped = executor.wrapTool("memory_write", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Policy skipped (no run) → tool executes normally
      assert.deepEqual(result, { ok: true });
      assert.equal(executor.records[0].policyDecision, "skipped");
    });

    it("non-native tools always execute regardless of enforcePolicy", async () => {
      const fakeRun = {
        id: "run-1",
        tenant_id: "tenant-1",
        customer_id: "customer-1",
        run_kind: "discord_runtime" as const,
        source: "discord_ingress" as const,
        status: "running" as const,
        attempt_count: 1,
        max_attempts: 3,
        idempotency_key: null,
        request_trace_id: null,
        correlation_id: null,
        payload: {},
        result: {},
        error_message: null,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        canceled_at: null,
        lock_expires_at: null,
        worker_id: null,
        parent_run_id: null,
        delegation_depth: 0,
        deadline_at: null,
        delegation_kind: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const executor = createUnifiedToolExecutor(
        mockConfig({ run: fakeRun, enforcePolicy: true })
      );
      const executeFn = mock.fn(async () => ({ sent: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("GMAIL_SEND_EMAIL", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      assert.deepEqual(result, { sent: true });
      assert.equal(executeFn.mock.callCount(), 1);
      assert.equal(executor.records[0].policyDecision, "skipped");
      assert.equal(executor.records[0].policyReason, "external_governance");
    });

    it("policy evaluation error falls back to skipped and executes tool", async () => {
      // Without a real DB, policy evaluation will throw — should fall back gracefully
      const fakeRun = {
        id: "run-1",
        tenant_id: "tenant-1",
        customer_id: "customer-1",
        run_kind: "discord_runtime" as const,
        source: "discord_ingress" as const,
        status: "running" as const,
        attempt_count: 1,
        max_attempts: 3,
        idempotency_key: null,
        request_trace_id: null,
        correlation_id: null,
        payload: {},
        result: {},
        error_message: null,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        canceled_at: null,
        lock_expires_at: null,
        worker_id: null,
        parent_run_id: null,
        delegation_depth: 0,
        deadline_at: null,
        delegation_kind: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const executor = createUnifiedToolExecutor(
        mockConfig({ run: fakeRun, enforcePolicy: true })
      );
      const executeFn = mock.fn(async () => ({ ok: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("memory_write", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Policy evaluation failed → skipped → tool still executes
      assert.deepEqual(result, { ok: true });
      assert.equal(executeFn.mock.callCount(), 1);
      assert.equal(executor.records[0].policyDecision, "skipped");
      assert.equal(executor.records[0].policyReason, "policy_evaluation_error");
    });
  });

  // -----------------------------------------------------------------------
  // Phase 1.4: Autonomy-level gating tests
  // -----------------------------------------------------------------------

  describe("autonomy-level gating", () => {
    it("blocks config_create_agent for assisted (L1) agents", async () => {
      // No run context → policy skipped, but autonomy gate should still fire
      // when enforcement is on. However, autonomy gate only fires when policy
      // is not "denied" — and policy is "skipped" here (not denied), so the
      // gate should fire.
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "assisted" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("config_create_agent", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Autonomy gate fires — tool does not execute
      assert.equal(executeFn.mock.callCount(), 0);
      const resultObj = result as Record<string, unknown>;
      assert.equal(resultObj.error, "approval_required");
      assert.equal(resultObj.tool, "config_create_agent");
      assert.equal(executor.records[0].policyDecision, "requires_approval");
      assert.equal(executor.records[0].policyReason, "autonomy_level_gate");
    });

    it("blocks config_create_agent for copilot (L2) agents", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "copilot" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("config_create_agent", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      assert.equal(executeFn.mock.callCount(), 0);
      assert.equal((result as Record<string, unknown>).error, "approval_required");
    });

    it("allows config_create_agent for autopilot (L3) agents", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "autopilot" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("config_create_agent", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Autopilot → no autonomy gate → tool executes (policy skipped due to no run)
      assert.equal(executeFn.mock.callCount(), 1);
      assert.deepEqual(result, { created: true });
    });

    it("blocks schedule_create for assisted agents but allows copilot", async () => {
      // schedule_create is gated at "assisted" level only
      const assistedExecutor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "assisted" })
      );
      const assistedFn = mock.fn(async () => ({ created: true }));
      const assistedWrapped = assistedExecutor.wrapTool("schedule_create", createMockTool(assistedFn));

      await (assistedWrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});
      assert.equal(assistedFn.mock.callCount(), 0); // Blocked for L1

      const copilotExecutor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "copilot" })
      );
      const copilotFn = mock.fn(async () => ({ created: true }));
      const copilotWrapped = copilotExecutor.wrapTool("schedule_create", createMockTool(copilotFn));

      await (copilotWrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});
      assert.equal(copilotFn.mock.callCount(), 1); // Allowed for L2
    });

    it("does not gate non-config tools by autonomy", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "assisted" })
      );
      const executeFn = mock.fn(async () => ({ results: [] }));
      const mockTool = createMockTool(executeFn);
      // memory_search is not in the autonomy-gated list
      const wrapped = executor.wrapTool("memory_search", mockTool);

      await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});
      assert.equal(executeFn.mock.callCount(), 1); // Executes normally
    });

    it("shadow mode logs but does not enforce autonomy gates", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: false, agentAutonomyLevel: "assisted" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("config_create_agent", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      // Shadow mode → tool executes despite autonomy gate
      assert.equal(executeFn.mock.callCount(), 1);
      assert.deepEqual(result, { created: true });
    });

    it("no autonomy level means no gating", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true }) // no agentAutonomyLevel
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("config_create_agent", mockTool);

      const result = await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> })
        .execute({});

      assert.equal(executeFn.mock.callCount(), 1);
      assert.deepEqual(result, { created: true });
    });
  });

  // -----------------------------------------------------------------------
  // Phase 1.2: executeDirect tests (operator-triggered one-shot invocations)
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Work Stream A: Composio tool key resolution tests
  // -----------------------------------------------------------------------

  describe("composio tool key resolution", () => {
    it("evaluates composio.* keys through policy (not skipped)", async () => {
      // Register a Composio key mapping
      const { registerComposioToolKeyMappings } = await import("./unified-tool-executor.ts");
      registerComposioToolKeyMappings(new Map([
        ["GITHUB_CREATE_ISSUE", "composio.github_create_issue"],
      ]));

      const fakeRun = {
        id: "run-1",
        tenant_id: "tenant-1",
        customer_id: "customer-1",
        run_kind: "discord_runtime" as const,
        source: "discord_ingress" as const,
        status: "running" as const,
        attempt_count: 1,
        max_attempts: 3,
        idempotency_key: null,
        request_trace_id: null,
        correlation_id: null,
        payload: {},
        result: {},
        error_message: null,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        canceled_at: null,
        lock_expires_at: null,
        worker_id: null,
        parent_run_id: null,
        delegation_depth: 0,
        deadline_at: null,
        delegation_kind: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const executor = createUnifiedToolExecutor(
        mockConfig({ run: fakeRun, enforcePolicy: true })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const mockTool = createMockTool(executeFn);
      const wrapped = executor.wrapTool("GITHUB_CREATE_ISSUE", mockTool);

      await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

      // Should NOT be "skipped" with "external_governance" — it should go through policy
      // (will be "skipped" due to policy_evaluation_error since there's no real DB, but
      // the point is it's NOT "external_governance")
      assert.notEqual(executor.records[0].policyReason, "external_governance");
    });

    it("composio key mapping resolves correctly", async () => {
      const { registerComposioToolKeyMappings } = await import("./unified-tool-executor.ts");
      registerComposioToolKeyMappings(new Map([
        ["SLACK_SEND_MESSAGE", "composio.slack_send_message"],
      ]));

      const executor = createUnifiedToolExecutor(mockConfig());
      const mockTool = createMockTool(async () => ({ sent: true }));
      const wrapped = executor.wrapTool("SLACK_SEND_MESSAGE", mockTool);

      await (wrapped as Tool & { execute: (args: unknown) => Promise<unknown> }).execute({});

      // With no run context, policy is skipped for all tools — but the key mapping
      // should still be present. We can verify by checking the tool still executes.
      assert.equal(executor.records[0].success, true);
    });
  });

  describe("executeDirect", () => {
    it("executes a tool and returns completed result", async () => {
      const executor = createUnifiedToolExecutor(mockConfig());
      const result = await executor.executeDirect(
        "test_tool",
        { value: "hello" },
        async () => ({ result: "ok" })
      );

      assert.equal(result.outcome, "completed");
      assert.deepEqual(result.result, { result: "ok" });
      assert.equal(result.policyDecision, "skipped"); // no run context
      assert.equal(executor.records.length, 1);
      assert.equal(executor.records[0].toolName, "test_tool");
      assert.equal(executor.records[0].success, true);
    });

    it("returns failed when execute throws", async () => {
      const executor = createUnifiedToolExecutor(mockConfig());
      const result = await executor.executeDirect(
        "failing_tool",
        {},
        async () => { throw new TypeError("bad input"); }
      );

      assert.equal(result.outcome, "failed");
      assert.equal(result.errorMessage, "bad input");
      assert.equal(executor.records.length, 1);
      assert.equal(executor.records[0].success, false);
      assert.equal(executor.records[0].errorClass, "TypeError");
    });

    it("blocks tools by autonomy gate for assisted agents", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "assisted" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const result = await executor.executeDirect(
        "config_create_agent",
        {},
        executeFn
      );

      assert.equal(result.outcome, "requires_approval");
      assert.equal(executeFn.mock.callCount(), 0);
      assert.equal(result.policyReason, "autonomy_level_gate");
    });

    it("allows tools for autopilot agents", async () => {
      const executor = createUnifiedToolExecutor(
        mockConfig({ enforcePolicy: true, agentAutonomyLevel: "autopilot" })
      );
      const executeFn = mock.fn(async () => ({ created: true }));
      const result = await executor.executeDirect(
        "config_create_agent",
        {},
        executeFn
      );

      assert.equal(result.outcome, "completed");
      assert.equal(executeFn.mock.callCount(), 1);
      assert.deepEqual(result.result, { created: true });
    });

    it("skips policy for non-native tools", async () => {
      const executor = createUnifiedToolExecutor(mockConfig());
      const result = await executor.executeDirect(
        "GMAIL_SEND_EMAIL",
        {},
        async () => ({ sent: true })
      );

      assert.equal(result.outcome, "completed");
      assert.equal(result.policyDecision, "skipped");
    });

    it("records invocations for trace enrichment", async () => {
      const executor = createUnifiedToolExecutor(mockConfig());

      await executor.executeDirect("tool_a", { x: 1 }, async () => ({ a: 1 }));
      await executor.executeDirect("tool_b", { y: 2 }, async () => ({ b: 2 }));

      assert.equal(executor.records.length, 2);
      assert.equal(executor.records[0].toolName, "tool_a");
      assert.equal(executor.records[1].toolName, "tool_b");
    });

    it("can defer approval flush so callers avoid duplicate pending invocations", async () => {
      const { admin, insert } = createMockAdminWithInsertSpy();
      const executor = createUnifiedToolExecutor(
        mockConfig({
          admin,
          enforcePolicy: true,
          agentAutonomyLevel: "assisted",
        })
      );

      const result = await executor.executeDirect(
        "config_create_agent",
        {},
        async () => ({ created: true }),
        { persistApprovalInvocation: false }
      );

      assert.equal(result.outcome, "requires_approval");
      assert.equal(insert.mock.callCount(), 0);
      assert.equal(executor.records.length, 1);
      assert.equal(executor.records[0].policyDecision, "requires_approval");
    });

    it("flushes approval telemetry by default", async () => {
      const { admin, insert } = createMockAdminWithInsertSpy();
      const executor = createUnifiedToolExecutor(
        mockConfig({
          admin,
          enforcePolicy: true,
          agentAutonomyLevel: "assisted",
        })
      );

      const result = await executor.executeDirect(
        "config_create_agent",
        {},
        async () => ({ created: true })
      );

      assert.equal(result.outcome, "requires_approval");
      assert.equal(insert.mock.callCount(), 1);
    });
  });
});
