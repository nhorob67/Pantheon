import assert from "node:assert/strict";
import test from "node:test";
import { toolRegistry } from "./tool-registry";
import { NATIVE_TOOL_CATALOG } from "./tool-catalog";

test("tool registry is populated from native catalog on first access", () => {
  assert.ok(toolRegistry.size > 0);
  assert.equal(toolRegistry.size, NATIVE_TOOL_CATALOG.size);
});

test("tool registry returns metadata for known native tools", () => {
  const meta = toolRegistry.get("memory_search");
  assert.ok(meta);
  assert.equal(meta.toolKey, "memory_search");
  assert.equal(meta.category, "memory");
});

test("tool registry returns undefined for unknown tools", () => {
  assert.equal(toolRegistry.get("nonexistent_tool"), undefined);
});

// ---------------------------------------------------------------------------
// isQuery
// ---------------------------------------------------------------------------

test("isQuery returns true for query tools", () => {
  const queryTools = [
    "memory_search",
    "memory_read",
    "conversation_search",
    "schedule_list",
    "config_view_my_config",
    "config_list_agents",
    "integration_list",
    "integration_templates",
    "delegation_poll",
  ];
  for (const tool of queryTools) {
    assert.equal(toolRegistry.isQuery(tool), true, `Expected ${tool} to be a query tool`);
  }
});

test("isQuery returns false for mutation tools", () => {
  const mutationTools = [
    "memory_write",
    "schedule_create",
    "config_set_my_goal",
    "delegate_task",
    "file_create",
  ];
  for (const tool of mutationTools) {
    assert.equal(toolRegistry.isQuery(tool), false, `Expected ${tool} NOT to be a query tool`);
  }
});

test("isQuery returns false for unknown tools", () => {
  assert.equal(toolRegistry.isQuery("unknown_tool"), false);
});

// ---------------------------------------------------------------------------
// isMutating
// ---------------------------------------------------------------------------

test("isMutating returns true for writesState tools", () => {
  assert.equal(toolRegistry.isMutating("memory_write"), true);
  assert.equal(toolRegistry.isMutating("schedule_create"), true);
  assert.equal(toolRegistry.isMutating("file_create"), true);
});

test("isMutating returns false for read-only tools", () => {
  assert.equal(toolRegistry.isMutating("memory_search"), false);
  assert.equal(toolRegistry.isMutating("web_search"), false);
});

// ---------------------------------------------------------------------------
// Autonomy gate
// ---------------------------------------------------------------------------

test("getAutonomyGate matches the previous AUTONOMY_GATED_TOOLS map exactly", () => {
  // This test ensures the registry produces identical behavior to the old
  // hardcoded AUTONOMY_GATED_TOOLS map that was removed from unified-tool-executor.ts.
  const expected: Record<string, "assisted" | "copilot"> = {
    config_create_agent: "copilot",
    config_archive_agent: "copilot",
    config_set_my_autonomy: "copilot",
    config_update_team_profile: "copilot",
    config_set_my_delegation: "copilot",
    config_undo_last_change: "copilot",
    schedule_create: "assisted",
    schedule_delete: "assisted",
    delegate_task: "assisted",
    integration_store_credential: "copilot",
    integration_register: "assisted",
    browser_click: "copilot",
    browser_fill: "copilot",
    browser_navigate: "assisted",
  };

  for (const [tool, gate] of Object.entries(expected)) {
    assert.equal(
      toolRegistry.getAutonomyGate(tool),
      gate,
      `Expected ${tool} to have autonomy gate "${gate}" but got "${toolRegistry.getAutonomyGate(tool)}"`
    );
  }
});

test("getAutonomyGate returns undefined for ungated tools", () => {
  assert.equal(toolRegistry.getAutonomyGate("memory_write"), undefined);
  assert.equal(toolRegistry.getAutonomyGate("web_search"), undefined);
  assert.equal(toolRegistry.getAutonomyGate("unknown_tool"), undefined);
});

// ---------------------------------------------------------------------------
// Dynamic registration
// ---------------------------------------------------------------------------

test("register adds a dynamic tool", () => {
  toolRegistry.register({
    toolKey: "mcp_test_tool",
    displayName: "MCP Test Tool",
    description: "A test MCP tool",
    source: { type: "mcp", serverKey: "test", serverToolName: "tool" },
    category: "mcp",
    riskLevel: "low",
    capabilities: {
      networkAccess: true,
      writesState: false,
      requiresApproval: false,
      supportsStreaming: false,
    },
    isQuery: true,
  });

  const meta = toolRegistry.get("mcp_test_tool");
  assert.ok(meta);
  assert.equal(meta.toolKey, "mcp_test_tool");
  assert.equal(toolRegistry.isQuery("mcp_test_tool"), true);
});
