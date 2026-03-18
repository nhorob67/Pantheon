import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NATIVE_TOOL_CATALOG,
  NATIVE_TOOL_ENTRIES,
  getNativeToolMeta,
} from "./tool-catalog.ts";

// Regex from the tenant_tools DB constraint
const TOOL_KEY_REGEX = /^[a-z0-9][a-z0-9_.-]{1,127}$/;

describe("tool-catalog", () => {
  it("has no duplicate tool keys", () => {
    const keys = NATIVE_TOOL_ENTRIES.map((t) => t.toolKey);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size, `Duplicate keys: ${keys.filter((k, i) => keys.indexOf(k) !== i)}`);
  });

  it("all tool keys match the DB constraint regex", () => {
    for (const entry of NATIVE_TOOL_ENTRIES) {
      assert.ok(
        TOOL_KEY_REGEX.test(entry.toolKey),
        `Invalid tool key: "${entry.toolKey}" — must match ${TOOL_KEY_REGEX}`
      );
    }
  });

  it("all entries have non-empty display names and descriptions", () => {
    for (const entry of NATIVE_TOOL_ENTRIES) {
      assert.ok(entry.displayName.length > 0, `Empty displayName for ${entry.toolKey}`);
      assert.ok(entry.description.length > 0, `Empty description for ${entry.toolKey}`);
      assert.ok(
        entry.displayName.length <= 120,
        `displayName too long for ${entry.toolKey}: ${entry.displayName.length} chars`
      );
    }
  });

  it("all entries have source type native", () => {
    for (const entry of NATIVE_TOOL_ENTRIES) {
      assert.equal(entry.source.type, "native", `${entry.toolKey} should be native`);
    }
  });

  it("risk levels are valid", () => {
    const validLevels = new Set(["low", "medium", "high", "critical"]);
    for (const entry of NATIVE_TOOL_ENTRIES) {
      assert.ok(
        validLevels.has(entry.riskLevel),
        `Invalid risk level "${entry.riskLevel}" for ${entry.toolKey}`
      );
    }
  });

  it("high/critical tools have requiresApproval=true in capabilities", () => {
    for (const entry of NATIVE_TOOL_ENTRIES) {
      if (entry.riskLevel === "high" || entry.riskLevel === "critical") {
        assert.equal(
          entry.capabilities.requiresApproval,
          true,
          `${entry.toolKey} is ${entry.riskLevel} but requiresApproval=false`
        );
      }
    }
  });

  it("low/medium tools have requiresApproval=false in capabilities", () => {
    for (const entry of NATIVE_TOOL_ENTRIES) {
      if (entry.riskLevel === "low" || entry.riskLevel === "medium") {
        assert.equal(
          entry.capabilities.requiresApproval,
          false,
          `${entry.toolKey} is ${entry.riskLevel} but requiresApproval=true`
        );
      }
    }
  });

  it("reveal_secret defaults to disabled status", () => {
    const meta = getNativeToolMeta("reveal_secret");
    assert.ok(meta, "reveal_secret not found in catalog");
    assert.equal(meta.defaultStatus, "disabled");
    assert.equal(meta.defaultApprovalMode, "always");
    assert.equal(meta.riskLevel, "critical");
  });

  it("browser click/fill rely on browser-policy approvals instead of catalog always-approval", () => {
    const clickMeta = getNativeToolMeta("browser_click");
    const fillMeta = getNativeToolMeta("browser_fill");

    assert.ok(clickMeta, "browser_click not found in catalog");
    assert.ok(fillMeta, "browser_fill not found in catalog");
    assert.equal(clickMeta.defaultApprovalMode, "none");
    assert.equal(fillMeta.defaultApprovalMode, "none");
  });

  it("http_request has networkAccess=true", () => {
    const meta = getNativeToolMeta("http_request");
    assert.ok(meta, "http_request not found in catalog");
    assert.equal(meta.capabilities.networkAccess, true);
  });

  it("map and array have same length", () => {
    assert.equal(NATIVE_TOOL_CATALOG.size, NATIVE_TOOL_ENTRIES.length);
  });

  it("getNativeToolMeta returns undefined for unknown keys", () => {
    assert.equal(getNativeToolMeta("nonexistent_tool"), undefined);
  });

  it("covers all expected native tools", () => {
    const expected = [
      "memory_write", "memory_search", "memory_read",
      "schedule_create", "schedule_list", "schedule_toggle", "schedule_delete",
      "config_view_my_config", "config_list_agents",
      "config_set_my_goal", "config_set_my_role", "config_set_my_backstory",
      "config_set_display_name", "config_set_my_autonomy", "config_toggle_skill",
      "config_set_my_delegation", "config_update_team_profile",
      "config_create_agent", "config_archive_agent", "config_undo_last_change",
      "use_credential", "reveal_secret",
      "file_create",
      "delegate_task", "delegate_task_async", "delegation_poll", "delegation_cancel",
      "browser_navigate", "browser_extract", "browser_click", "browser_fill", "browser_screenshot",
      "file_create",
      "http_request",
      "web_search", "web_fetch",
    ];
    for (const key of expected) {
      assert.ok(NATIVE_TOOL_CATALOG.has(key), `Missing expected tool: ${key}`);
    }
    assert.equal(NATIVE_TOOL_ENTRIES.length, expected.length, "Unexpected extra tools in catalog");
  });
});
