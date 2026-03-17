import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toMcpToolKey, parseMcpToolKey } from "./mcp-tool-keys.ts";

describe("mcp-tool-keys", () => {
  describe("toMcpToolKey", () => {
    it("creates namespaced tool key", () => {
      assert.equal(
        toMcpToolKey("github", "create_issue"),
        "mcp.github.create_issue"
      );
    });

    it("normalizes tool names to lowercase with underscores", () => {
      assert.equal(
        toMcpToolKey("my-server", "Create Issue"),
        "mcp.my-server.create_issue"
      );
    });

    it("strips leading/trailing separators from tool name", () => {
      assert.equal(
        toMcpToolKey("srv", "_my_tool_"),
        "mcp.srv.my_tool"
      );
    });

    it("truncates very long tool names", () => {
      const longName = "a".repeat(200);
      const key = toMcpToolKey("srv", longName);
      assert.ok(key.length <= 4 + 3 + 1 + 100);
    });

    it("handles special characters in tool names", () => {
      assert.equal(
        toMcpToolKey("srv", "My Tool (v2)"),
        "mcp.srv.my_tool_v2"
      );
    });
  });

  describe("parseMcpToolKey", () => {
    it("parses a valid MCP tool key", () => {
      const result = parseMcpToolKey("mcp.github.create_issue");
      assert.deepEqual(result, {
        serverKey: "github",
        toolName: "create_issue",
      });
    });

    it("handles server keys with hyphens", () => {
      const result = parseMcpToolKey("mcp.my-server.list_users");
      assert.deepEqual(result, {
        serverKey: "my-server",
        toolName: "list_users",
      });
    });

    it("returns null for non-MCP keys", () => {
      assert.equal(parseMcpToolKey("memory_write"), null);
      assert.equal(parseMcpToolKey("composio.gmail_send"), null);
    });

    it("returns null for malformed MCP keys", () => {
      assert.equal(parseMcpToolKey("mcp."), null);
      assert.equal(parseMcpToolKey("mcp.notools"), null);
    });

    it("handles tool names with dots", () => {
      const result = parseMcpToolKey("mcp.srv.sub.tool");
      assert.deepEqual(result, {
        serverKey: "srv",
        toolName: "sub.tool",
      });
    });

    it("roundtrips with toMcpToolKey", () => {
      const key = toMcpToolKey("github", "list_repos");
      const parsed = parseMcpToolKey(key);
      assert.ok(parsed);
      assert.equal(parsed.serverKey, "github");
      assert.equal(parsed.toolName, "list_repos");
    });
  });
});
