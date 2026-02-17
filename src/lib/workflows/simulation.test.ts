import test from "node:test";
import assert from "node:assert/strict";
import { simulateWorkflowGraph } from "./simulation.ts";

test("simulation reaches end on linear workflow", () => {
  const result = simulateWorkflowGraph({
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Trigger",
          position: { x: 100, y: 100 },
          config: {},
        },
        {
          id: "act-1",
          type: "action",
          label: "Action",
          position: { x: 360, y: 100 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "End",
          position: { x: 620, y: 100 },
          config: {},
        },
      ],
      edges: [
        { id: "edge-1", source: "tri-1", target: "act-1", when: "always" },
        { id: "edge-2", source: "act-1", target: "end-1", when: "always" },
      ],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.completed, true);
  assert.equal(result.stop_reason, "end_reached");
  assert.equal(result.steps.length, 3);
});

test("simulation stops at approval node when stopAtApproval is enabled", () => {
  const result = simulateWorkflowGraph({
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Trigger",
          position: { x: 100, y: 100 },
          config: {},
        },
        {
          id: "app-1",
          type: "approval",
          label: "Approval",
          position: { x: 360, y: 100 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "End",
          position: { x: 620, y: 100 },
          config: {},
        },
      ],
      edges: [
        { id: "edge-1", source: "tri-1", target: "app-1", when: "always" },
        { id: "edge-2", source: "app-1", target: "end-1", when: "always" },
      ],
    },
    stopAtApproval: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.completed, false);
  assert.equal(result.stop_reason, "approval_required");
  assert.equal(result.steps[1]?.node_type, "approval");
});

test("simulation applies explicit branch decisions for condition nodes", () => {
  const result = simulateWorkflowGraph({
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Trigger",
          position: { x: 100, y: 100 },
          config: {},
        },
        {
          id: "con-1",
          type: "condition",
          label: "Condition",
          position: { x: 360, y: 100 },
          config: {},
        },
        {
          id: "act-true",
          type: "action",
          label: "True path",
          position: { x: 620, y: 30 },
          config: {},
        },
        {
          id: "act-false",
          type: "action",
          label: "False path",
          position: { x: 620, y: 180 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "End",
          position: { x: 860, y: 100 },
          config: {},
        },
      ],
      edges: [
        { id: "edge-1", source: "tri-1", target: "con-1", when: "always" },
        { id: "edge-2", source: "con-1", target: "act-true", when: "true" },
        { id: "edge-3", source: "con-1", target: "act-false", when: "false" },
        { id: "edge-4", source: "act-true", target: "end-1", when: "always" },
        { id: "edge-5", source: "act-false", target: "end-1", when: "always" },
      ],
    },
    branchDecisions: {
      "con-1": false,
    },
  });

  assert.equal(result.stop_reason, "end_reached");
  assert.equal(
    result.steps.find((step) => step.node_id === "con-1")?.next_node_id,
    "act-false"
  );
});

test("simulation returns validation_failed for incompatible graphs", () => {
  const result = simulateWorkflowGraph({
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Trigger",
          position: { x: 100, y: 100 },
          config: {},
        },
        {
          id: "act-1",
          type: "action",
          label: "Action",
          position: { x: 360, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: "edge-1", source: "tri-1", target: "act-1", when: "always" }],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.stop_reason, "validation_failed");
  assert.ok(result.validation_errors.length > 0);
});
