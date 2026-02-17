import { workflowExportDocumentSchema } from "../validators/workflow.ts";
import type { WorkflowDefinition, WorkflowGraph } from "../../types/workflow";
import type { z } from "zod/v4";

export const WORKFLOW_EXPORT_SCHEMA_VERSION = 1 as const;

export type WorkflowExportDocument = z.infer<typeof workflowExportDocumentSchema>;

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 20)
    )
  );
}

function cloneWorkflowGraph(graph: WorkflowGraph): WorkflowGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: {
        ...node.position,
      },
      config:
        typeof node.config === "object" && node.config !== null
          ? { ...node.config }
          : {},
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
    })),
    metadata:
      graph.metadata && typeof graph.metadata === "object"
        ? { ...graph.metadata }
        : undefined,
  };
}

export function buildWorkflowExportDocument(
  workflow: WorkflowDefinition
): WorkflowExportDocument {
  return workflowExportDocumentSchema.parse({
    schema_version: WORKFLOW_EXPORT_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    source: {
      workflow_id: workflow.id,
      instance_id: workflow.instance_id,
      customer_id: workflow.customer_id,
      draft_version: workflow.draft_version,
      status: workflow.status,
    },
    workflow: {
      name: workflow.name,
      description: workflow.description,
      tags: normalizeTags(workflow.tags),
      owner_id: workflow.owner_id,
      graph: cloneWorkflowGraph(workflow.draft_graph),
      metadata:
        workflow.draft_graph.metadata &&
        typeof workflow.draft_graph.metadata === "object"
          ? { ...workflow.draft_graph.metadata }
          : undefined,
    },
  });
}

export function resolveImportedWorkflowDraft(input: {
  document: WorkflowExportDocument;
  name?: string;
  description?: string | null;
  tags?: string[];
  owner_id?: string | null;
}): {
  name: string;
  description: string | null;
  tags: string[];
  owner_id: string | null;
  graph: WorkflowGraph;
} {
  const { document } = input;
  const defaultDescription = document.workflow.description;

  const nextName = (input.name ?? document.workflow.name).trim();
  if (nextName.length === 0) {
    throw new Error("Workflow name is required.");
  }

  return {
    name: nextName,
    description:
      input.description === undefined
        ? defaultDescription
        : input.description && input.description.trim().length > 0
          ? input.description.trim()
          : null,
    tags: normalizeTags(input.tags ?? document.workflow.tags),
    owner_id:
      input.owner_id === undefined ? document.workflow.owner_id : input.owner_id,
    graph: cloneWorkflowGraph(document.workflow.graph),
  };
}
