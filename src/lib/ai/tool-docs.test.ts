import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildToolDocumentation } from "./tool-docs.ts";

describe("buildToolDocumentation", () => {
  it("returns empty string for no tools", () => {
    assert.equal(buildToolDocumentation([]), "");
  });

  it("groups memory tools under Memory category with descriptions", () => {
    const result = buildToolDocumentation(["memory_search", "memory_write"]);
    assert.ok(result.includes("**Memory**"));
    assert.ok(result.includes("`memory_search`"));
    assert.ok(result.includes("`memory_write`"));
    // Should include descriptions from catalog
    assert.ok(result.includes("Search long-term memory"));
    assert.ok(result.includes("Save a fact"));
  });

  it("groups config tools under Self-Configuration", () => {
    const result = buildToolDocumentation([
      "config_list_agents",
      "config_create_agent",
    ]);
    assert.ok(result.includes("**Self-Configuration**"));
    assert.ok(result.includes("`config_list_agents`"));
    assert.ok(result.includes("`config_create_agent`"));
  });

  it("includes all categories when full tool set is provided", () => {
    const tools = [
      "memory_search",
      "memory_write",
      "schedule_create",
      "schedule_list",
      "config_list_agents",
      "use_credential",
      "http_request",
      "composio_execute",
    ];
    const result = buildToolDocumentation(tools);
    assert.ok(result.includes("**Memory**"));
    assert.ok(result.includes("**Schedules**"));
    assert.ok(result.includes("**Self-Configuration**"));
    assert.ok(result.includes("**Credentials**"));
    assert.ok(result.includes("**Network**"));
    assert.ok(result.includes("**Integrations**"));
  });

  it("groups conversation_search under Memory", () => {
    const result = buildToolDocumentation(["memory_search", "conversation_search"]);
    assert.ok(result.includes("**Memory** —"));
    assert.ok(result.includes("`conversation_search`"));
  });

  it("puts unknown-prefix tools under Other", () => {
    const result = buildToolDocumentation(["custom_tool", "memory_search"]);
    assert.ok(result.includes("**Other**"));
    assert.ok(result.includes("`custom_tool`"));
  });

  it("omits categories with no tools", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(!result.includes("**Schedules**"));
    assert.ok(!result.includes("**Self-Configuration**"));
    assert.ok(!result.includes("**Credentials**"));
    assert.ok(!result.includes("**Network**"));
    assert.ok(!result.includes("**Integrations**"));
  });

  it("includes capability preamble", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(
      result.includes("## Your Capabilities"),
      "Should have capabilities heading"
    );
    assert.ok(
      result.includes("Do not claim you cannot do it"),
      "Should include affirmation instruction"
    );
  });

  it("includes behavioral instruction to call tools immediately", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(
      result.includes("Call tools immediately when needed"),
      "Should include instruction to call tools immediately"
    );
  });

  it("renders non-catalog tools without descriptions", () => {
    const result = buildToolDocumentation(["composio_github_create_issue"]);
    assert.ok(result.includes("`composio_github_create_issue`"));
    // Composio tools should not have a " — " description suffix (no catalog entry)
    assert.ok(!result.includes("composio_github_create_issue` —"));
  });

  it("renders file_create tool with description", () => {
    const result = buildToolDocumentation(["file_create"]);
    assert.ok(result.includes("**File Creation**"));
    assert.ok(result.includes("`file_create`"));
    assert.ok(result.includes("Discord attachments"));
  });

  it("renders category summaries", () => {
    const result = buildToolDocumentation(["memory_search"]);
    assert.ok(
      result.includes("**Memory** — Save and retrieve long-term information"),
      "Should include category summary"
    );
  });
});
