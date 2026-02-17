import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkflowRequestSchema,
  updateWorkflowRequestSchema,
  validateWorkflowGraph,
} from "./workflow.ts";
import type { WorkflowGraph, WorkflowNodeType } from "../../types/workflow.ts";

function buildNode(id: string, type: WorkflowNodeType, label = id) {
  return {
    id,
    type,
    label,
    position: { x: 0, y: 0 },
    config: {},
  };
}

function buildLinearGraph(): WorkflowGraph {
  return {
    nodes: [
      buildNode("tri-1", "trigger", "Trigger"),
      buildNode("act-1", "action", "Action"),
      buildNode("end-1", "end", "End"),
    ],
    edges: [
      { id: "edge-1", source: "tri-1", target: "act-1", when: "always" },
      { id: "edge-2", source: "act-1", target: "end-1", when: "always" },
    ],
  };
}

function collectCodes(result: ReturnType<typeof validateWorkflowGraph>): Set<string> {
  return new Set(result.errors.map((error) => error.code));
}

test("validateWorkflowGraph accepts a minimal valid linear workflow", () => {
  const result = validateWorkflowGraph(buildLinearGraph());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateWorkflowGraph enforces condition branch requirements", () => {
  const graph: WorkflowGraph = {
    nodes: [
      buildNode("tri-1", "trigger", "Trigger"),
      buildNode("con-1", "condition", "Check"),
      buildNode("end-1", "end", "End"),
    ],
    edges: [
      { id: "edge-1", source: "tri-1", target: "con-1", when: "always" },
      { id: "edge-2", source: "con-1", target: "end-1", when: "always" },
    ],
  };

  const result = validateWorkflowGraph(graph);
  const codes = collectCodes(result);

  assert.equal(result.valid, false);
  assert.equal(codes.has("CONDITION_EDGE_REQUIRES_BRANCH"), true);
  assert.equal(codes.has("CONDITION_BRANCH_MISSING_TRUE"), true);
  assert.equal(codes.has("CONDITION_BRANCH_MISSING_FALSE"), true);
});

test("validateWorkflowGraph reports both cycles and unreachable nodes", () => {
  const graph: WorkflowGraph = {
    nodes: [
      buildNode("tri-1", "trigger", "Trigger"),
      buildNode("act-1", "action", "Act"),
      buildNode("con-1", "condition", "Condition"),
      buildNode("end-1", "end", "End"),
    ],
    edges: [
      { id: "edge-1", source: "tri-1", target: "act-1", when: "always" },
      { id: "edge-2", source: "act-1", target: "con-1", when: "always" },
      { id: "edge-3", source: "con-1", target: "act-1", when: "true" },
      { id: "edge-4", source: "con-1", target: "act-1", when: "false" },
    ],
  };

  const result = validateWorkflowGraph(graph);
  const codes = collectCodes(result);
  const unreachable = result.errors.find((error) => error.code === "UNREACHABLE_NODE");

  assert.equal(result.valid, false);
  assert.equal(codes.has("CYCLE_DETECTED"), true);
  assert.equal(codes.has("UNREACHABLE_NODE"), true);
  assert.equal(unreachable?.node_id, "end-1");
});

test("validateWorkflowGraph returns schema errors for malformed graph payloads", () => {
  const malformed = {
    nodes: [
      {
        id: "tri-1",
        type: "trigger",
        label: "Trigger",
        position: { x: "oops", y: 0 },
        config: {},
      },
    ],
    edges: [],
  };

  const result = validateWorkflowGraph(malformed);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
  assert.equal(result.errors.every((error) => error.code === "SCHEMA_INVALID"), true);
});

test("createWorkflowRequestSchema normalizes empty description and deduplicates tags", () => {
  const parsed = createWorkflowRequestSchema.parse({
    name: "Visual Builder QA",
    description: "",
    graph: buildLinearGraph(),
    tags: ["ops", "ops", "field"],
    owner_id: null,
  });

  assert.equal(parsed.description, null);
  assert.deepEqual(parsed.tags, ["ops", "field"]);
});

test("updateWorkflowRequestSchema rejects updates without mutable fields", () => {
  const parsed = updateWorkflowRequestSchema.safeParse({
    expected_draft_version: 2,
  });

  assert.equal(parsed.success, false);
});
