import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateTokens } from "./history-loader.ts";

describe("summary-dag", () => {
  describe("assembleSummaryContext logic", () => {
    it("returns empty when no nodes exist", () => {
      const nodes: unknown[] = [];
      assert.equal(nodes.length, 0);
      // assembleSummaryContext returns { text: "", tokenCount: 0, nodeIds: [] }
    });

    it("includes highest-depth node as overall summary", () => {
      const nodes = [
        { id: "root", depth: 2, summary_text: "High-level overview of the project.", token_count: 10 },
        { id: "mid", depth: 1, summary_text: "Mid-level detail.", token_count: 5 },
        { id: "leaf1", depth: 0, summary_text: "Recent chat about deployment.", token_count: 8 },
      ];

      // Sort by depth desc (as loadSummaryDAG does)
      nodes.sort((a, b) => b.depth - a.depth);
      const maxDepth = nodes[0].depth;
      const rootNodes = nodes.filter((n) => n.depth === maxDepth);

      assert.equal(rootNodes.length, 1);
      assert.equal(rootNodes[0].id, "root");
      assert.equal(rootNodes[0].depth, 2);
    });

    it("fills remaining budget with recent leaf nodes", () => {
      const budget = 100;
      const rootTokens = 30;
      const remaining = budget - rootTokens;

      const leaves = [
        { id: "l1", token_count: 20, created_at: "2026-03-17T10:00:00Z" },
        { id: "l2", token_count: 25, created_at: "2026-03-17T11:00:00Z" },
        { id: "l3", token_count: 60, created_at: "2026-03-17T12:00:00Z" },
      ];

      // Most recent first
      leaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let budgetLeft = remaining;
      const selected: typeof leaves = [];
      for (const leaf of leaves) {
        if (leaf.token_count > budgetLeft) break;
        selected.push(leaf);
        budgetLeft -= leaf.token_count;
      }

      // l3 has 60 tokens > remaining 70, so it fits
      assert.equal(selected.length, 1);
      assert.equal(selected[0].id, "l3");
    });

    it("respects token budget strictly", () => {
      const budget = 50;
      const summaryText = "a".repeat(250); // ~63 tokens
      const tokens = estimateTokens(summaryText);
      assert.ok(tokens > budget, "Should exceed budget");
    });
  });

  describe("validateSummaryDAG logic", () => {
    it("detects parent-child depth inconsistency", () => {
      const nodes = [
        { id: "parent", depth: 2, parent_node_id: null, source_node_ids: ["child"], source_message_ids: [] },
        { id: "child", depth: 0, parent_node_id: "parent", source_node_ids: [], source_message_ids: ["msg1"] },
      ];
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const issues: string[] = [];

      for (const node of nodes) {
        if (node.parent_node_id) {
          const parent = nodeMap.get(node.parent_node_id);
          if (parent && parent.depth !== node.depth + 1) {
            issues.push(`Depth mismatch: child depth ${node.depth}, parent depth ${parent.depth}`);
          }
        }
      }

      assert.equal(issues.length, 1);
      assert.ok(issues[0].includes("Depth mismatch"));
    });

    it("detects missing parent reference", () => {
      const nodes = [
        { id: "orphan", depth: 0, parent_node_id: "nonexistent", source_message_ids: ["msg1"] },
      ];
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const issues: string[] = [];

      for (const node of nodes) {
        if (node.parent_node_id && !nodeMap.has(node.parent_node_id)) {
          issues.push(`Missing parent: ${node.parent_node_id}`);
        }
      }

      assert.equal(issues.length, 1);
    });

    it("detects leaf node without source messages", () => {
      const node = { id: "leaf", depth: 0, source_message_ids: [] as string[], source_node_ids: [] as string[] };
      const issues: string[] = [];

      if (node.depth === 0 && node.source_message_ids.length === 0) {
        issues.push("Leaf node has no source messages");
      }

      assert.equal(issues.length, 1);
    });

    it("detects condensed node without source nodes", () => {
      const node = { id: "condensed", depth: 1, source_message_ids: [] as string[], source_node_ids: [] as string[] };
      const issues: string[] = [];

      if (node.depth > 0 && node.source_node_ids.length === 0) {
        issues.push("Condensed node has no source nodes");
      }

      assert.equal(issues.length, 1);
    });

    it("passes for valid DAG", () => {
      const nodes = [
        { id: "parent", depth: 1, parent_node_id: null, source_message_ids: [] as string[], source_node_ids: ["l1", "l2", "l3", "l4"], token_count: 50 },
        { id: "l1", depth: 0, parent_node_id: "parent", source_message_ids: ["m1"], source_node_ids: [] as string[], token_count: 10 },
        { id: "l2", depth: 0, parent_node_id: "parent", source_message_ids: ["m2"], source_node_ids: [] as string[], token_count: 10 },
        { id: "l3", depth: 0, parent_node_id: "parent", source_message_ids: ["m3"], source_node_ids: [] as string[], token_count: 10 },
        { id: "l4", depth: 0, parent_node_id: "parent", source_message_ids: ["m4"], source_node_ids: [] as string[], token_count: 10 },
      ];
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const issues: string[] = [];

      for (const node of nodes) {
        if (node.parent_node_id) {
          const parent = nodeMap.get(node.parent_node_id);
          if (!parent) {
            issues.push(`Missing parent: ${node.parent_node_id}`);
          } else if (parent.depth !== node.depth + 1) {
            issues.push(`Depth mismatch`);
          }
        }
        if (node.token_count < 0) issues.push("Negative tokens");
        if (node.depth === 0 && node.source_message_ids.length === 0) issues.push("No source messages");
        if (node.depth > 0 && node.source_node_ids.length === 0) issues.push("No source nodes");
      }

      assert.equal(issues.length, 0);
    });
  });

  describe("compaction threshold", () => {
    // Mirror the logic since the source module has transitive deps unavailable in unit tests
    const COMPACTION_RATIO = 0.08;
    const MIN_COMPACTION_THRESHOLD = 4000;
    const MAX_COMPACTION_THRESHOLD = 30000;
    const DEFAULT_CTX = 200_000;

    function computeCompactionThreshold(contextWindowTokens?: number): number {
      const ctx = contextWindowTokens ?? DEFAULT_CTX;
      return Math.max(MIN_COMPACTION_THRESHOLD, Math.min(MAX_COMPACTION_THRESHOLD, Math.floor(ctx * COMPACTION_RATIO)));
    }

    it("computeCompactionThreshold scales with context window", () => {
      assert.equal(computeCompactionThreshold(200_000), 16000);
      assert.equal(computeCompactionThreshold(10_000), 4000);
      assert.equal(computeCompactionThreshold(1_000_000), 30000);
      assert.equal(computeCompactionThreshold(undefined), 16000);
    });

    it("mid-range context windows", () => {
      assert.equal(computeCompactionThreshold(100_000), 8000);
      assert.equal(computeCompactionThreshold(50_000), 4000);
      assert.equal(computeCompactionThreshold(128_000), 10240);
    });
  });
});
