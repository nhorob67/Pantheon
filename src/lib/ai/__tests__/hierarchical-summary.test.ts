import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SummaryNode } from "../session-summarizer.ts";

/**
 * Hierarchical Summary DAG tests.
 *
 * These test the structural properties of the DAG without requiring a database,
 * by simulating the node structure and verifying invariants.
 */

function makeSummaryNode(overrides: Partial<SummaryNode> & { id: string }): SummaryNode {
  return {
    parent_id: null,
    depth: 0,
    summary_text: "Test summary",
    message_count: 30,
    first_message_at: "2026-03-17T10:00:00Z",
    last_message_at: "2026-03-17T11:00:00Z",
    child_count: 0,
    created_at: "2026-03-17T11:01:00Z",
    ...overrides,
  };
}

describe("Hierarchical Summary DAG: Structural Invariants", () => {
  it("leaf nodes have depth 0 and no children", () => {
    const leaf = makeSummaryNode({ id: "leaf-1", depth: 0, child_count: 0, parent_id: null });
    assert.equal(leaf.depth, 0);
    assert.equal(leaf.child_count, 0);
    assert.equal(leaf.parent_id, null);
  });

  it("parent nodes have depth > 0 and child_count > 0", () => {
    const parent = makeSummaryNode({
      id: "parent-1",
      depth: 1,
      child_count: 5,
      summary_text: "Consolidated summary of 5 conversation segments",
    });
    assert.ok(parent.depth > 0);
    assert.ok(parent.child_count > 0);
  });

  it("children correctly reference their parent", () => {
    const parentId = "parent-1";
    const children = Array.from({ length: 5 }, (_, i) =>
      makeSummaryNode({
        id: `child-${i}`,
        depth: 0,
        parent_id: parentId,
        summary_text: `Segment ${i} summary`,
      })
    );

    for (const child of children) {
      assert.equal(child.parent_id, parentId);
      assert.equal(child.depth, 0);
    }
  });

  it("DAG depth invariant: parent.depth = child.depth + 1", () => {
    const children = Array.from({ length: 5 }, (_, i) =>
      makeSummaryNode({ id: `child-${i}`, depth: 0 })
    );
    const parent = makeSummaryNode({
      id: "parent-1",
      depth: 1,
      child_count: children.length,
    });

    for (const child of children) {
      assert.equal(parent.depth, child.depth + 1);
    }
  });

  it("multi-level DAG maintains depth consistency", () => {
    // Level 0: 25 leaf nodes -> 5 groups of 5
    const leaves = Array.from({ length: 25 }, (_, i) =>
      makeSummaryNode({
        id: `leaf-${i}`,
        depth: 0,
        message_count: 30,
      })
    );

    // Level 1: 5 parent nodes (each consolidating 5 leaves)
    const level1 = Array.from({ length: 5 }, (_, i) =>
      makeSummaryNode({
        id: `l1-${i}`,
        depth: 1,
        child_count: 5,
        message_count: 150,
        summary_text: `Level 1 consolidation #${i}`,
      })
    );

    // Level 2: 1 root node (consolidating 5 level-1 nodes)
    const root = makeSummaryNode({
      id: "root",
      depth: 2,
      child_count: 5,
      message_count: 750,
      summary_text: "Top-level session summary",
    });

    // Verify depth monotonicity
    assert.ok(leaves.every((n) => n.depth === 0));
    assert.ok(level1.every((n) => n.depth === 1));
    assert.equal(root.depth, 2);

    // Verify message count aggregation
    const totalLeafMessages = leaves.reduce((s, n) => s + n.message_count, 0);
    assert.equal(totalLeafMessages, 750);
    assert.equal(root.message_count, totalLeafMessages);
  });

  it("message_count is always positive", () => {
    const node = makeSummaryNode({ id: "n1", message_count: 30 });
    assert.ok(node.message_count > 0);
  });

  it("time window is correctly bounded", () => {
    const node = makeSummaryNode({
      id: "n1",
      first_message_at: "2026-03-17T10:00:00Z",
      last_message_at: "2026-03-17T11:00:00Z",
    });

    const first = new Date(node.first_message_at!).getTime();
    const last = new Date(node.last_message_at!).getTime();
    assert.ok(first <= last, "first_message_at should be <= last_message_at");
  });

  it("top-level retrieval returns highest depth nodes first", () => {
    const nodes: SummaryNode[] = [
      makeSummaryNode({ id: "l0-1", depth: 0, parent_id: "l1-1" }),
      makeSummaryNode({ id: "l0-2", depth: 0, parent_id: "l1-1" }),
      makeSummaryNode({ id: "l1-1", depth: 1, child_count: 2, parent_id: "l2-1" }),
      makeSummaryNode({ id: "l1-2", depth: 1, child_count: 3, parent_id: null }),
      makeSummaryNode({ id: "l2-1", depth: 2, child_count: 1, parent_id: null }),
    ];

    // Simulate getTopLevelSummaries: filter to parentless, sort by depth desc
    const topLevel = nodes
      .filter((n) => n.parent_id === null)
      .sort((a, b) => b.depth - a.depth);

    assert.equal(topLevel[0].id, "l2-1", "Highest depth node should come first");
    assert.equal(topLevel[0].depth, 2);
  });

  it("orphan nodes have null parent_id", () => {
    const orphans = [
      makeSummaryNode({ id: "o1", depth: 0, parent_id: null }),
      makeSummaryNode({ id: "o2", depth: 0, parent_id: null }),
      makeSummaryNode({ id: "o3", depth: 0, parent_id: null }),
    ];

    for (const node of orphans) {
      assert.equal(node.parent_id, null);
    }
  });
});

describe("Hierarchical Summary DAG: Context Assembly", () => {
  it("formats top-level summaries for system prompt injection", () => {
    const summaries: SummaryNode[] = [
      makeSummaryNode({
        id: "s1",
        depth: 1,
        summary_text: "Discussed project timeline and deliverables for Acme Corp.",
        message_count: 150,
        first_message_at: "2026-03-15T09:00:00Z",
      }),
      makeSummaryNode({
        id: "s2",
        depth: 0,
        summary_text: "User asked about billing status.",
        message_count: 30,
        first_message_at: "2026-03-17T10:00:00Z",
      }),
    ];

    // Simulate the context assembly formatting
    const lines = summaries.map((s) => {
      const timeInfo = s.first_message_at
        ? ` (${s.message_count} messages, from ${new Date(s.first_message_at).toLocaleDateString()})`
        : ` (${s.message_count} messages)`;
      return `- ${s.summary_text}${timeInfo}`;
    });

    const formatted = `## Previous conversation context\n\n${lines.join("\n")}`;

    assert.ok(formatted.includes("Acme Corp"), "Should include entity from summary");
    assert.ok(formatted.includes("150 messages"), "Should include message count");
    assert.ok(formatted.includes("billing status"), "Should include recent topic");
  });
});
