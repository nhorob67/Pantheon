import test from "node:test";
import assert from "node:assert/strict";
import type { WorkflowDefinition } from "../../types/workflow.ts";
import { workflowExportDocumentSchema } from "../validators/workflow.ts";
import {
  WORKFLOW_EXPORT_SCHEMA_VERSION,
  buildWorkflowExportDocument,
  resolveImportedWorkflowDraft,
} from "./import-export.ts";

const SAMPLE_WORKFLOW: WorkflowDefinition = {
  id: "11111111-1111-4111-8111-111111111111",
  instance_id: "22222222-2222-4222-8222-222222222222",
  customer_id: "33333333-3333-4333-8333-333333333333",
  name: "Order Follow-up",
  description: "Follow up on order events.",
  tags: ["orders", "follow-up"],
  owner_id: "44444444-4444-4444-8444-444444444444",
  status: "draft",
  draft_graph: {
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
    metadata: {
      max_runtime_seconds: 180,
    },
  },
  draft_version: 5,
  published_version: 4,
  is_valid: true,
  last_validation_errors: [],
  last_validated_at: "2026-02-16T00:00:00.000Z",
  created_by: "44444444-4444-4444-8444-444444444444",
  updated_by: "44444444-4444-4444-8444-444444444444",
  created_at: "2026-02-16T00:00:00.000Z",
  updated_at: "2026-02-16T00:00:00.000Z",
};

test("buildWorkflowExportDocument emits schema-compatible payload", () => {
  const document = buildWorkflowExportDocument(SAMPLE_WORKFLOW);
  const parsed = workflowExportDocumentSchema.parse(document);

  assert.equal(parsed.schema_version, WORKFLOW_EXPORT_SCHEMA_VERSION);
  assert.equal(parsed.source.workflow_id, SAMPLE_WORKFLOW.id);
  assert.equal(parsed.workflow.name, SAMPLE_WORKFLOW.name);
  assert.deepEqual(parsed.workflow.tags, SAMPLE_WORKFLOW.tags);
  assert.equal(parsed.workflow.owner_id, SAMPLE_WORKFLOW.owner_id);
});

test("resolveImportedWorkflowDraft supports overrides and keeps graph isolated", () => {
  const document = buildWorkflowExportDocument(SAMPLE_WORKFLOW);

  const draft = resolveImportedWorkflowDraft({
    document,
    name: "Imported workflow",
    description: "Imported description",
    tags: ["imported", "orders"],
    owner_id: "55555555-5555-4555-8555-555555555555",
  });

  assert.equal(draft.name, "Imported workflow");
  assert.equal(draft.description, "Imported description");
  assert.deepEqual(draft.tags, ["imported", "orders"]);
  assert.equal(draft.owner_id, "55555555-5555-4555-8555-555555555555");
  assert.notEqual(draft.graph, document.workflow.graph);

  const originalLabel = document.workflow.graph.nodes[0]?.label;
  draft.graph.nodes[0]!.label = "Mutated";
  assert.equal(document.workflow.graph.nodes[0]?.label, originalLabel);
});

test("workflow export schema rejects unsupported versions", () => {
  const document = buildWorkflowExportDocument(SAMPLE_WORKFLOW) as Record<
    string,
    unknown
  >;
  document.schema_version = 999;

  const parsed = workflowExportDocumentSchema.safeParse(document);
  assert.equal(parsed.success, false);
});
