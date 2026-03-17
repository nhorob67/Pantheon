import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDelegationTree,
  countDelegationTreeNodes,
  isChildBudgetAccountedToParent,
  readMetadataNumber,
  type DelegationTreeNode,
} from "./async-delegation-utils.ts";

function makeNode(
  overrides: Partial<Omit<DelegationTreeNode, "children">> = {}
): Omit<DelegationTreeNode, "children"> {
  return {
    id: "run-1",
    parent_run_id: "root-run",
    run_kind: "delegation_runtime",
    status: "completed",
    delegation_kind: "async",
    delegation_depth: 1,
    target_agent_name: "Research Agent",
    created_at: "2026-03-16T12:00:00.000Z",
    completed_at: "2026-03-16T12:00:05.000Z",
    latency_ms: 5000,
    ...overrides,
  };
}

test("buildDelegationTree nests descendants under their direct parent", () => {
  const tree = buildDelegationTree(
    [
      makeNode({ id: "child-a", parent_run_id: "root-run", created_at: "2026-03-16T12:00:00.000Z" }),
      makeNode({ id: "grandchild-a1", parent_run_id: "child-a", delegation_depth: 2, created_at: "2026-03-16T12:00:01.000Z" }),
      makeNode({ id: "child-b", parent_run_id: "root-run", created_at: "2026-03-16T12:00:02.000Z" }),
    ],
    "root-run"
  );

  assert.equal(tree.length, 2);
  assert.equal(tree[0]?.id, "child-a");
  assert.equal(tree[0]?.children.length, 1);
  assert.equal(tree[0]?.children[0]?.id, "grandchild-a1");
  assert.equal(tree[1]?.id, "child-b");
});

test("countDelegationTreeNodes counts the full descendant set", () => {
  const tree = buildDelegationTree(
    [
      makeNode({ id: "child-a", parent_run_id: "root-run" }),
      makeNode({ id: "grandchild-a1", parent_run_id: "child-a", delegation_depth: 2 }),
      makeNode({ id: "grandchild-a2", parent_run_id: "child-a", delegation_depth: 2 }),
    ],
    "root-run"
  );

  assert.equal(countDelegationTreeNodes(tree), 3);
});

test("isChildBudgetAccountedToParent only returns true for the matching parent run", () => {
  assert.equal(
    isChildBudgetAccountedToParent(
      { budget_accounted_to_parent_run_id: "parent-1" },
      "parent-1"
    ),
    true
  );
  assert.equal(
    isChildBudgetAccountedToParent(
      { budget_accounted_to_parent_run_id: "parent-1" },
      "parent-2"
    ),
    false
  );
});

test("readMetadataNumber falls back to zero for missing or invalid values", () => {
  assert.equal(readMetadataNumber({ spend_cents: 42 }, "spend_cents"), 42);
  assert.equal(readMetadataNumber({ spend_cents: "42" }, "spend_cents"), 0);
  assert.equal(readMetadataNumber(null, "spend_cents"), 0);
});
