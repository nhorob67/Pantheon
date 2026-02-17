import test from "node:test";
import assert from "node:assert/strict";
import type { WorkflowTemplate } from "../../types/workflow.ts";
import {
  buildWorkflowDraftFromTemplate,
  getStarterWorkflowTemplateById,
  isWorkflowTemplateVisibleToTenant,
  listStarterWorkflowTemplates,
} from "./templates-core.ts";

test("starter templates are cloned per call", () => {
  const templateA = getStarterWorkflowTemplateById("starter-lead-response");
  const templateB = getStarterWorkflowTemplateById("starter-lead-response");

  assert.ok(templateA);
  assert.ok(templateB);
  assert.notEqual(templateA, templateB);

  const originalLabel = templateB.graph.nodes[0]?.label;
  templateA.graph.nodes[0]!.label = "Mutated label";
  assert.equal(templateB.graph.nodes[0]?.label, originalLabel);
});

test("buildWorkflowDraftFromTemplate clones graph and records template metadata", () => {
  const template = getStarterWorkflowTemplateById("starter-approval-gate");
  assert.ok(template);

  const draft = buildWorkflowDraftFromTemplate({
    template,
    name: "  High-risk gate workflow  ",
    description: undefined,
  });

  assert.equal(draft.name, "High-risk gate workflow");
  assert.equal(draft.description, template.description);
  assert.deepEqual(draft.metadata, {
    template_id: template.id,
    template_kind: template.template_kind,
    template_version: template.latest_version,
  });
  assert.notEqual(draft.graph, template.graph);

  const templateNodeLabel = template.graph.nodes[0]?.label;
  draft.graph.nodes[0]!.label = "Changed in draft";
  assert.equal(template.graph.nodes[0]?.label, templateNodeLabel);
});

test("isWorkflowTemplateVisibleToTenant enforces custom template tenant scope", () => {
  const customTemplate: WorkflowTemplate = {
    id: "custom-template-1",
    instance_id: "instance-a",
    customer_id: "customer-a",
    name: "Custom Template",
    description: "Internal template",
    template_kind: "custom",
    latest_version: 1,
    graph: { nodes: [], edges: [] },
    metadata: {},
    created_by: null,
    updated_by: null,
    created_at: "2026-02-16T00:00:00.000Z",
    updated_at: "2026-02-16T00:00:00.000Z",
  };

  assert.equal(
    isWorkflowTemplateVisibleToTenant(customTemplate, "instance-a", "customer-a"),
    true
  );
  assert.equal(
    isWorkflowTemplateVisibleToTenant(customTemplate, "instance-b", "customer-a"),
    false
  );
  assert.equal(
    isWorkflowTemplateVisibleToTenant(customTemplate, "instance-a", "customer-b"),
    false
  );
});

test("starter templates are always visible and listed", () => {
  const starterTemplates = listStarterWorkflowTemplates();
  assert.ok(starterTemplates.length >= 3);

  const starter = starterTemplates[0]!;
  assert.equal(
    isWorkflowTemplateVisibleToTenant(starter, "instance-any", "customer-any"),
    true
  );
});
