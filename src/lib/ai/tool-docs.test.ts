import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildToolDocumentation } from "./tool-docs.ts";

describe("buildToolDocumentation", () => {
  it("returns empty string for no tools", () => {
    assert.equal(buildToolDocumentation([]), "");
  });

  it("groups memory tools under Memory category", () => {
    const result = buildToolDocumentation(["memory_search", "memory_write"]);
    assert.ok(result.includes("**Memory:**"));
    assert.ok(result.includes("`memory_search`"));
    assert.ok(result.includes("`memory_write`"));
  });

  it("groups config tools under Self-Configuration", () => {
    const result = buildToolDocumentation([
      "config_list_agents",
      "config_create_agent",
      "config_update_agent",
    ]);
    assert.ok(result.includes("**Self-Configuration:**"));
    assert.ok(result.includes("`config_list_agents`"));
    assert.ok(result.includes("`config_create_agent`"));
    assert.ok(result.includes("`config_update_agent`"));
  });

  it("includes all categories when full tool set is provided", () => {
    const tools = [
      "memory_search",
      "memory_write",
      "schedule_create",
      "schedule_list",
      "config_list_agents",
      "credential_list",
      "http_request",
      "composio_execute",
    ];
    const result = buildToolDocumentation(tools);
    assert.ok(result.includes("**Memory:**"));
    assert.ok(result.includes("**Schedules:**"));
    assert.ok(result.includes("**Self-Configuration:**"));
    assert.ok(result.includes("**Credentials:**"));
    assert.ok(result.includes("**HTTP:**"));
    assert.ok(result.includes("**Integrations:**"));
  });

  it("puts unknown-prefix tools under Other", () => {
    const result = buildToolDocumentation(["custom_tool", "memory_search"]);
    assert.ok(result.includes("**Other:**"));
    assert.ok(result.includes("`custom_tool`"));
  });

  it("omits categories with no tools", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(!result.includes("**Schedules:**"));
    assert.ok(!result.includes("**Self-Configuration:**"));
    assert.ok(!result.includes("**Credentials:**"));
    assert.ok(!result.includes("**HTTP:**"));
    assert.ok(!result.includes("**Integrations:**"));
  });

  it("includes behavioral instruction", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(
      result.includes("call the appropriate tool immediately"),
      "Should include instruction to call tools immediately"
    );
  });
});
