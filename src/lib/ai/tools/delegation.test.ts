import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adjustChildBudget,
  canExposeDelegationTool,
  injectDelegationContext,
  MAX_DELEGATION_DEPTH,
  narrowChildTools,
} from "./delegation-helpers.ts";

describe("delegation helpers", () => {
  it("exposes delegation only for delegation-enabled agents under the depth limit", () => {
    assert.equal(canExposeDelegationTool(true, 0), true);
    assert.equal(canExposeDelegationTool(true, MAX_DELEGATION_DEPTH - 1), true);
    assert.equal(canExposeDelegationTool(true, MAX_DELEGATION_DEPTH), false);
    assert.equal(canExposeDelegationTool(false, 0), false);
    assert.equal(canExposeDelegationTool(undefined, 0), false);
  });

  it("injects parent/task context into the child system prompt", () => {
    const prompt = injectDelegationContext("Base prompt", "Parent Agent", "Review the document", "Customer is blocked");
    assert.match(prompt, /Parent Agent/);
    assert.match(prompt, /Review the document/);
    assert.match(prompt, /Customer is blocked/);
  });

  it("narrows child tools to the parent-child intersection", () => {
    const narrowed = narrowChildTools(
      {
        memory_search: "memory",
        custom_tool_a: "allowed",
        custom_tool_b: "blocked",
      },
      new Set(["custom_tool_a"])
    );

    assert.deepEqual(Object.keys(narrowed), ["custom_tool_a"]);
  });

  it("skips narrowing when the parent tool set is empty", () => {
    const childTools = {
      memory_search: "memory",
      custom_tool_a: "allowed",
    };

    assert.deepEqual(narrowChildTools(childTools, new Set<string>()), childTools);
  });

  it("inherits remaining invocation, token, spend, and time budget", () => {
    const adjusted = adjustChildBudget(
      {
        maxToolInvocations: 10,
        maxTokens: 50000,
        maxSpendCents: 200,
        maxElapsedMs: 60000,
      },
      {
        totalInvocations: 3,
        totalTokens: 20000,
        totalSpendCents: 80,
        elapsedMs: 15000,
      }
    );

    assert.deepEqual(adjusted, {
      maxToolInvocations: 7,
      maxTokens: 30000,
      maxSpendCents: 120,
      maxElapsedMs: 45000,
    });
  });
});
