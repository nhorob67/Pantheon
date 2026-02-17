import test from "node:test";
import assert from "node:assert/strict";
import { evaluateWorkflowExperiment } from "./experiments.ts";

test("experiment evaluator auto-generates default variants for conditional graph", () => {
  const result = evaluateWorkflowExperiment({
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
          position: { x: 300, y: 100 },
          config: {},
        },
        {
          id: "act-true",
          type: "action",
          label: "True path",
          position: { x: 520, y: 50 },
          config: {},
        },
        {
          id: "act-false",
          type: "action",
          label: "False path",
          position: { x: 520, y: 180 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "End",
          position: { x: 760, y: 100 },
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
  });

  assert.equal(result.ok, true);
  assert.equal(result.variants.length, 2);
  assert.ok(result.winner_variant_id);
  assert.ok(result.variants.every((variant) => typeof variant.score === "number"));
});

test("experiment evaluator reports invalid graphs", () => {
  const result = evaluateWorkflowExperiment({
    graph: {
      nodes: [
        {
          id: "tri-1",
          type: "trigger",
          label: "Trigger",
          position: { x: 100, y: 100 },
          config: {},
        },
      ],
      edges: [],
    },
  });

  assert.equal(result.ok, false);
  assert.ok(result.validation_errors.length > 0);
  assert.equal(result.winner_variant_id, null);
});

test("experiment evaluator honors custom variants", () => {
  const result = evaluateWorkflowExperiment({
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
          position: { x: 300, y: 100 },
          config: {},
        },
        {
          id: "end-1",
          type: "end",
          label: "End",
          position: { x: 520, y: 100 },
          config: {},
        },
      ],
      edges: [
        { id: "edge-1", source: "tri-1", target: "act-1", when: "always" },
        { id: "edge-2", source: "act-1", target: "end-1", when: "always" },
      ],
    },
    variants: [
      {
        id: "A",
        label: "Variant A",
        branch_decisions: {},
      },
      {
        id: "B",
        label: "Variant B",
        branch_decisions: {},
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.variants.length, 2);
  assert.equal(result.variants[0]?.id, "A");
});
