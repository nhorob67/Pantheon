import test from "node:test";
import assert from "node:assert/strict";
import { generateWorkflowDraftFromNaturalLanguage } from "./nl-draft.ts";
import { validateWorkflowGraph } from "../validators/workflow.ts";

test("nl draft generation infers schedule trigger and approval branching", () => {
  const result = generateWorkflowDraftFromNaturalLanguage({
    prompt:
      "Every weekday at 6am in UTC, run diagnostics, if risk is high require manager approval, otherwise continue and finish.",
  });

  const triggerNode = result.draft.graph.nodes.find((node) => node.type === "trigger");
  assert.ok(triggerNode);
  assert.equal(triggerNode?.config.trigger_kind, "schedule");
  assert.equal(triggerNode?.config.timezone, "UTC");

  assert.ok(result.draft.graph.nodes.some((node) => node.type === "condition"));
  assert.ok(result.draft.graph.nodes.some((node) => node.type === "approval"));
  assert.ok(result.draft.graph.nodes.some((node) => node.type === "end"));

  const validation = validateWorkflowGraph(result.draft.graph);
  assert.equal(validation.valid, true);
});

test("nl draft generation honors explicit event trigger preference", () => {
  const result = generateWorkflowDraftFromNaturalLanguage({
    prompt: "When a new webhook event arrives, route to fallback action and end.",
    preferredTrigger: "event",
  });

  const triggerNode = result.draft.graph.nodes.find((node) => node.type === "trigger");
  assert.ok(triggerNode);
  assert.equal(triggerNode?.config.trigger_kind, "event");
  assert.ok(result.detected_capabilities.includes("event_trigger"));
});

test("nl draft generation creates non-empty draft metadata", () => {
  const result = generateWorkflowDraftFromNaturalLanguage({
    prompt: "Manually run inventory sync and notify the team.",
    name: "Inventory Sync",
  });

  assert.equal(result.draft.name, "Inventory Sync");
  assert.ok(result.draft.graph.nodes.length >= 3);
  assert.ok(result.draft.graph.edges.length >= 2);
  assert.equal(result.draft.graph.metadata?.draft_origin, "nl_generator");
});
