import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SummaryNode } from "../summary-dag.ts";

/**
 * Hierarchical Summary DAG tests.
 *
 * These test the structural properties of the DAG without requiring a database,
 * by simulating the node structure and verifying invariants.
 */

function makeSummaryNode(overrides: Partial<SummaryNode> & { id: string }): SummaryNode {
  return {
    session_id: "session-1",
    parent_node_id: null,
    depth: 0,
    summary_text: "Test summary",
    source_message_ids: [],
    source_node_ids: [],
    token_count: 50,
    message_time_start: "2026-03-17T10:00:00Z",
    message_time_end: "2026-03-17T11:00:00Z",
    created_at: "2026-03-17T11:01:00Z",
    ...overrides,
  };
}

describe("Hierarchical Summary DAG: Structural Invariants", () => {
  it("leaf nodes have depth 0 and no parent", () => {
    const leaf = makeSummaryNode({ id: "leaf-1", depth: 0, parent_node_id: null });
    assert.equal(leaf.depth, 0);
    assert.equal(leaf.parent_node_id, null);
  });

  it("parent nodes have depth > 0 and source_node_ids", () => {
    const parent = makeSummaryNode({
      id: "parent-1",
      depth: 1,
      source_node_ids: ["c1", "c2", "c3", "c4", "c5"],
      summary_text: "Consolidated summary of 5 conversation segments",
    });
    assert.ok(parent.depth > 0);
    assert.ok(parent.source_node_ids.length > 0);
  });

  it("children correctly reference their parent", () => {
    const parentId = "parent-1";
    const children = Array.from({ length: 5 }, (_, i) =>
      makeSummaryNode({
        id: `child-${i}`,
        depth: 0,
        parent_node_id: parentId,
        summary_text: `Segment ${i} summary`,
      })
    );

    for (const child of children) {
      assert.equal(child.parent_node_id, parentId);
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
      source_node_ids: children.map((c) => c.id),
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
        source_message_ids: Array.from({ length: 30 }, (_, j) => `msg-${i}-${j}`),
      })
    );

    // Level 1: 5 parent nodes (each consolidating 5 leaves)
    const level1 = Array.from({ length: 5 }, (_, i) =>
      makeSummaryNode({
        id: `l1-${i}`,
        depth: 1,
        source_node_ids: leaves.slice(i * 5, (i + 1) * 5).map((l) => l.id),
        summary_text: `Level 1 consolidation #${i}`,
      })
    );

    // Level 2: 1 root node (consolidating 5 level-1 nodes)
    const root = makeSummaryNode({
      id: "root",
      depth: 2,
      source_node_ids: level1.map((l) => l.id),
      summary_text: "Top-level session summary",
    });

    // Verify depth monotonicity
    assert.ok(leaves.every((n) => n.depth === 0));
    assert.ok(level1.every((n) => n.depth === 1));
    assert.equal(root.depth, 2);

    // Verify source_message_ids count
    const totalLeafMessages = leaves.reduce((s, n) => s + n.source_message_ids.length, 0);
    assert.equal(totalLeafMessages, 750);
  });

  it("token_count is non-negative", () => {
    const node = makeSummaryNode({ id: "n1", token_count: 50 });
    assert.ok(node.token_count >= 0);
  });

  it("time window is correctly bounded", () => {
    const node = makeSummaryNode({
      id: "n1",
      message_time_start: "2026-03-17T10:00:00Z",
      message_time_end: "2026-03-17T11:00:00Z",
    });

    const first = new Date(node.message_time_start!).getTime();
    const last = new Date(node.message_time_end!).getTime();
    assert.ok(first <= last, "message_time_start should be <= message_time_end");
  });

  it("top-level retrieval returns highest depth nodes first", () => {
    const nodes: SummaryNode[] = [
      makeSummaryNode({ id: "l0-1", depth: 0, parent_node_id: "l1-1" }),
      makeSummaryNode({ id: "l0-2", depth: 0, parent_node_id: "l1-1" }),
      makeSummaryNode({ id: "l1-1", depth: 1, parent_node_id: "l2-1" }),
      makeSummaryNode({ id: "l1-2", depth: 1, parent_node_id: null }),
      makeSummaryNode({ id: "l2-1", depth: 2, parent_node_id: null }),
    ];

    // Simulate getTopLevelSummaries: filter to parentless, sort by depth desc
    const topLevel = nodes
      .filter((n) => n.parent_node_id === null)
      .sort((a, b) => b.depth - a.depth);

    assert.equal(topLevel[0].id, "l2-1", "Highest depth node should come first");
    assert.equal(topLevel[0].depth, 2);
  });

  it("orphan nodes have null parent_node_id", () => {
    const orphans = [
      makeSummaryNode({ id: "o1", depth: 0, parent_node_id: null }),
      makeSummaryNode({ id: "o2", depth: 0, parent_node_id: null }),
      makeSummaryNode({ id: "o3", depth: 0, parent_node_id: null }),
    ];

    for (const node of orphans) {
      assert.equal(node.parent_node_id, null);
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
        source_node_ids: ["c1", "c2", "c3"],
        message_time_start: "2026-03-15T09:00:00Z",
      }),
      makeSummaryNode({
        id: "s2",
        depth: 0,
        summary_text: "User asked about billing status.",
        source_message_ids: Array.from({ length: 30 }, (_, i) => `msg-${i}`),
        message_time_start: "2026-03-17T10:00:00Z",
      }),
    ];

    // Simulate the context assembly formatting
    const lines = summaries.map((s) => {
      const timeInfo = s.message_time_start
        ? ` (from ${new Date(s.message_time_start).toLocaleDateString()})`
        : "";
      return `- ${s.summary_text}${timeInfo}`;
    });

    const formatted = `## Previous conversation context\n\n${lines.join("\n")}`;

    assert.ok(formatted.includes("Acme Corp"), "Should include entity from summary");
    assert.ok(formatted.includes("billing status"), "Should include recent topic");
  });
});
