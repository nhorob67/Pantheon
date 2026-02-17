import { z } from "zod/v4";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_EDGE_CONDITIONS,
  WORKFLOW_MAX_EDGES,
  WORKFLOW_MAX_NODES,
  WORKFLOW_NODE_TYPES,
  WORKFLOW_ENVIRONMENTS,
  WORKFLOW_PLAYBOOK_STATUSES,
  WORKFLOW_PLAYBOOK_VISIBILITIES,
  WORKFLOW_APPROVAL_STATUSES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_RUN_TRIGGER_TYPES,
  WORKFLOW_RUN_STEP_STATUSES,
  type WorkflowGraph,
  type WorkflowValidationError,
  type WorkflowValidationResult,
} from "../../types/workflow.ts";

const nodeIdSchema = z
  .string()
  .trim()
  .min(1, "Node ID is required")
  .max(120, "Node ID must be 120 characters or less");

const edgeIdSchema = z
  .string()
  .trim()
  .min(1, "Edge ID is required")
  .max(120, "Edge ID must be 120 characters or less");

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const metadataSchema = z.record(z.string(), z.unknown());

export const workflowNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.enum(WORKFLOW_NODE_TYPES),
  label: z
    .string()
    .trim()
    .min(1, "Node label is required")
    .max(120, "Node label must be 120 characters or less"),
  position: positionSchema,
  config: metadataSchema.default({}),
});

export const workflowEdgeSchema = z.object({
  id: edgeIdSchema,
  source: nodeIdSchema,
  target: nodeIdSchema,
  when: z.enum(WORKFLOW_EDGE_CONDITIONS).default("always"),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(workflowNodeSchema).max(WORKFLOW_MAX_NODES),
  edges: z.array(workflowEdgeSchema).max(WORKFLOW_MAX_EDGES),
  metadata: metadataSchema.optional(),
});

export const workflowValidateRequestSchema = z
  .object({
    graph: z.unknown().optional(),
  })
  .strict();

const workflowNameSchema = z
  .string()
  .trim()
  .min(1, "Workflow name is required")
  .max(120, "Workflow name must be 120 characters or less");

const workflowDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be 1000 characters or less")
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value.length === 0) {
      return null;
    }

    return value;
  });

const workflowTagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(40, "Tag must be 40 characters or less");

const workflowTagsSchema = z
  .array(workflowTagSchema)
  .max(20, "At most 20 tags are allowed.")
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const deduped = Array.from(new Set(value.map((tag) => tag.trim())));
    return deduped;
  });

const workflowOwnerIdSchema = z.uuid().nullable().optional();

export const createWorkflowRequestSchema = z
  .object({
    name: workflowNameSchema,
    description: workflowDescriptionSchema,
    graph: workflowGraphSchema.optional(),
    tags: workflowTagsSchema,
    owner_id: workflowOwnerIdSchema,
  })
  .strict();

export const updateWorkflowRequestSchema = z
  .object({
    expected_draft_version: z
      .number()
      .int()
      .min(1, "expected_draft_version must be at least 1"),
    name: workflowNameSchema.optional(),
    description: workflowDescriptionSchema,
    graph: workflowGraphSchema.optional(),
    tags: workflowTagsSchema,
    owner_id: workflowOwnerIdSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.graph !== undefined ||
      value.tags !== undefined ||
      value.owner_id !== undefined,
    {
      message: "Provide at least one field to update.",
      path: ["graph"],
    }
  );

export const cloneWorkflowRequestSchema = z
  .object({
    name: workflowNameSchema.optional(),
  })
  .strict();

const metadataRecordSchema = z.record(z.string(), z.unknown());

export const createWorkflowTemplateRequestSchema = z
  .object({
    name: workflowNameSchema,
    description: workflowDescriptionSchema,
    graph: workflowGraphSchema,
    metadata: metadataRecordSchema.optional(),
  })
  .strict();

export const useWorkflowTemplateRequestSchema = z
  .object({
    name: workflowNameSchema,
    description: workflowDescriptionSchema,
    tags: workflowTagsSchema,
    owner_id: workflowOwnerIdSchema,
  })
  .strict();

const workflowImportDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description must be 1000 characters or less")
  .nullable();

export const workflowExportDocumentSchema = z
  .object({
    schema_version: z.literal(1),
    exported_at: z.string().trim().min(1).max(80),
    source: z
      .object({
        workflow_id: z.uuid(),
        instance_id: z.uuid(),
        customer_id: z.uuid(),
        draft_version: z.number().int().min(1),
        status: z.enum(WORKFLOW_STATUSES),
      })
      .strict(),
    workflow: z
      .object({
        name: workflowNameSchema,
        description: workflowImportDescriptionSchema,
        tags: z.array(workflowTagSchema).max(20).default([]),
        owner_id: z.uuid().nullable(),
        graph: workflowGraphSchema,
        metadata: metadataRecordSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const importWorkflowRequestSchema = z
  .object({
    document: workflowExportDocumentSchema,
    name: workflowNameSchema.optional(),
    description: workflowDescriptionSchema,
    tags: workflowTagsSchema,
    owner_id: workflowOwnerIdSchema,
  })
  .strict();

export const workflowSimulationRequestSchema = z
  .object({
    graph: workflowGraphSchema.optional(),
    input: metadataRecordSchema.optional(),
    branch_decisions: z.record(z.string(), z.boolean()).optional(),
    stop_at_approval: z.boolean().optional(),
    max_steps: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const workflowNLDraftRequestSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(10, "Prompt must be at least 10 characters long.")
      .max(4000, "Prompt must be 4000 characters or less."),
    name: workflowNameSchema.optional(),
    description: workflowDescriptionSchema,
    preferred_trigger: z.enum(["manual", "schedule", "event"]).optional(),
    max_nodes: z.number().int().min(3).max(100).optional(),
  })
  .strict();

const workflowExperimentVariantSchema = z
  .object({
    id: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1).max(120).optional(),
    branch_decisions: z.record(z.string(), z.boolean()).default({}),
  })
  .strict();

export const workflowExperimentRequestSchema = z
  .object({
    graph: workflowGraphSchema.optional(),
    variants: z.array(workflowExperimentVariantSchema).min(2).max(8).optional(),
    stop_at_approval: z.boolean().optional(),
    max_steps: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const workflowEnvironmentSchema = z.enum(WORKFLOW_ENVIRONMENTS);

export const workflowPromotionRequestSchema = z
  .object({
    target_environment: workflowEnvironmentSchema,
    source_version: z.number().int().min(1).optional(),
    note: z
      .string()
      .trim()
      .max(500, "Promotion note must be 500 characters or less.")
      .optional()
      .transform((value) => {
        if (!value || value.length === 0) {
          return undefined;
        }
        return value;
      }),
    metadata: metadataRecordSchema.optional(),
  })
  .strict();

const workflowPlaybookSlugSchema = z
  .string()
  .trim()
  .min(3, "Playbook slug must be at least 3 characters.")
  .max(120, "Playbook slug must be 120 characters or less.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Playbook slug must use lowercase letters, numbers, and hyphen separators.",
  });

const workflowPlaybookSummarySchema = z
  .string()
  .trim()
  .max(280, "Summary must be 280 characters or less.")
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value.length === 0) {
      return null;
    }

    return value;
  });

const workflowPlaybookCategorySchema = z
  .string()
  .trim()
  .max(80, "Category must be 80 characters or less.")
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value.length === 0) {
      return null;
    }

    return value;
  });

const workflowPlaybookStatusSchema = z.enum(WORKFLOW_PLAYBOOK_STATUSES);
const workflowPlaybookVisibilitySchema = z.enum(WORKFLOW_PLAYBOOK_VISIBILITIES);

export const createWorkflowPlaybookRequestSchema = z
  .object({
    workflow_id: z.uuid(),
    slug: workflowPlaybookSlugSchema,
    name: workflowNameSchema,
    description: workflowDescriptionSchema,
    summary: workflowPlaybookSummarySchema,
    category: workflowPlaybookCategorySchema,
    tags: workflowTagsSchema,
    visibility: workflowPlaybookVisibilitySchema.default("private"),
    status: workflowPlaybookStatusSchema.default("draft"),
    metadata: metadataRecordSchema.optional(),
  })
  .strict();

export const installWorkflowPlaybookRequestSchema = z
  .object({
    name: workflowNameSchema.optional(),
    description: workflowDescriptionSchema,
    tags: workflowTagsSchema,
    owner_id: workflowOwnerIdSchema,
  })
  .strict();

export const listWorkflowPlaybooksQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    status: workflowPlaybookStatusSchema.optional(),
    visibility: workflowPlaybookVisibilitySchema.optional(),
    include_owned: z.coerce.boolean().default(true),
    limit: z.coerce.number().int().min(1).max(100).default(40),
  })
  .strict();

export const createWorkflowRunRequestSchema = z
  .object({
    trigger_type: z.enum(WORKFLOW_RUN_TRIGGER_TYPES).default("manual"),
    input: metadataRecordSchema.optional(),
    metadata: metadataRecordSchema.optional(),
  })
  .strict();

const workflowRunDateFilterSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Use YYYY-MM-DD date format.",
});

const workflowCreatedAtIdCursorSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    const delimiterIndex = value.indexOf("|");
    if (delimiterIndex <= 0 || delimiterIndex >= value.length - 1) {
      return false;
    }

    const createdAt = value.slice(0, delimiterIndex);
    const id = value.slice(delimiterIndex + 1);
    if (id.includes("|")) {
      return false;
    }
    if (Number.isNaN(Date.parse(createdAt))) {
      return false;
    }

    return z.uuid().safeParse(id).success;
  }, {
    message: "cursor must use created_at|id format.",
  });

export const listWorkflowRunsQuerySchema = z
  .object({
    workflow_id: z.uuid().optional(),
    status: z.enum(WORKFLOW_RUN_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    cursor: workflowCreatedAtIdCursorSchema.optional(),
    started_from: workflowRunDateFilterSchema.optional(),
    started_to: workflowRunDateFilterSchema.optional(),
    min_duration_seconds: z.coerce.number().int().min(0).max(604800).optional(),
    max_duration_seconds: z.coerce.number().int().min(0).max(604800).optional(),
  })
  .refine(
    (value) =>
      !value.started_from ||
      !value.started_to ||
      value.started_to >= value.started_from,
    {
      path: ["started_to"],
      message: "started_to must be on or after started_from.",
    }
  )
  .refine(
    (value) =>
      value.min_duration_seconds === undefined ||
      value.max_duration_seconds === undefined ||
      value.max_duration_seconds >= value.min_duration_seconds,
    {
      path: ["max_duration_seconds"],
      message: "max_duration_seconds must be >= min_duration_seconds.",
    }
  );

export const listWorkflowApprovalsQuerySchema = z
  .object({
    run_id: z.uuid().optional(),
    workflow_id: z.uuid().optional(),
    status: z.enum(WORKFLOW_APPROVAL_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    cursor: workflowCreatedAtIdCursorSchema.optional(),
  })
  .strict();

export const workflowRunCancelRequestSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const workflowApprovalActionRequestSchema = z
  .object({
    comment: z
      .string()
      .trim()
      .max(2000, "Comment must be 2000 characters or less")
      .optional()
      .transform((value) => {
        if (!value || value.length === 0) {
          return undefined;
        }

        return value;
      }),
  })
  .strict();

export const workflowRunRetryStepRequestSchema = z
  .object({
    step_id: z.uuid(),
    reason: z.string().trim().max(500).optional(),
    input: metadataRecordSchema.optional(),
  })
  .strict();

export const workflowRollbackRequestSchema = z
  .object({
    target_version: z.number().int().min(1).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const workflowStatusMutationRequestSchema = z
  .object({
    archived: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const workflowPerformanceMetricNameSchema = z.enum([
  "INP",
  "LCP",
  "CLS",
]);

export const workflowPerformanceRouteKindSchema = z.enum(["builder", "list"]);

export const ingestWorkflowPerformanceMetricRequestSchema = z
  .object({
    metric_name: workflowPerformanceMetricNameSchema,
    route_kind: workflowPerformanceRouteKindSchema,
    value: z.number().finite().min(0).max(120000),
    id: z.string().trim().min(1).max(120).optional(),
    rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
    delta: z.number().finite().min(0).max(120000).optional(),
    navigation_type: z.string().trim().max(120).optional(),
    path: z.string().trim().max(300).optional(),
    source: z.string().trim().max(80).optional(),
    sampled_at: z.string().trim().max(80).optional(),
  })
  .strict();

export const workflowPerformanceSummaryQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(60).default(14),
    min_samples: z.coerce.number().int().min(5).max(1000).default(20),
  })
  .strict();

export const workflowLaunchReadinessQuerySchema = z
  .object({
    days: z.coerce.number().int().min(7).max(90).default(28),
    min_samples: z.coerce.number().int().min(5).max(1000).default(20),
  })
  .strict();

export const workflowLaunchReadinessSnapshotsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(30).default(12),
  })
  .strict();

export const workflowLaunchReadinessCaptureRequestSchema = z
  .object({
    days: z.coerce.number().int().min(7).max(90).default(28),
    min_samples: z.coerce.number().int().min(5).max(1000).default(20),
    instance_limit: z.coerce.number().int().min(1).max(500).default(250),
  })
  .strict();

export const workflowRunStepStatusSchema = z.enum(WORKFLOW_RUN_STEP_STATUSES);

function formatPath(path: (string | number)[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : segment
    )
    .join(".");
}

function sortErrors(
  errors: WorkflowValidationError[]
): WorkflowValidationError[] {
  return [...errors].sort((a, b) => {
    const keyA = `${a.code}|${a.node_id ?? ""}|${a.edge_id ?? ""}|${
      a.path ?? ""
    }|${a.message}`;
    const keyB = `${b.code}|${b.node_id ?? ""}|${b.edge_id ?? ""}|${
      b.path ?? ""
    }|${b.message}`;

    return keyA.localeCompare(keyB);
  });
}

function mapNodeCounts(nodes: WorkflowGraph["nodes"]): Map<string, number> {
  const nodeIdCounts = new Map<string, number>();

  for (const node of nodes) {
    nodeIdCounts.set(node.id, (nodeIdCounts.get(node.id) || 0) + 1);
  }

  return nodeIdCounts;
}

function mapEdgeCounts(edges: WorkflowGraph["edges"]): Map<string, number> {
  const edgeIdCounts = new Map<string, number>();

  for (const edge of edges) {
    edgeIdCounts.set(edge.id, (edgeIdCounts.get(edge.id) || 0) + 1);
  }

  return edgeIdCounts;
}

function buildAdjacency(
  graph: WorkflowGraph,
  nodeIdSet: Set<string>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const nodeId of nodeIdSet) {
    adjacency.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) {
      continue;
    }
    adjacency.get(edge.source)?.push(edge.target);
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort();
  }

  return adjacency;
}

function findCycleNodes(
  nodeIds: string[],
  adjacency: Map<string, string[]>
): string[] {
  const indegree = new Map<string, number>();
  for (const nodeId of nodeIds) {
    indegree.set(nodeId, 0);
  }

  for (const neighbors of adjacency.values()) {
    for (const target of neighbors) {
      indegree.set(target, (indegree.get(target) || 0) + 1);
    }
  }

  const queue = nodeIds
    .filter((nodeId) => (indegree.get(nodeId) || 0) === 0)
    .sort();
  let processed = 0;

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      break;
    }

    processed += 1;
    for (const target of adjacency.get(nodeId) || []) {
      indegree.set(target, (indegree.get(target) || 0) - 1);
      if ((indegree.get(target) || 0) === 0) {
        queue.push(target);
        queue.sort();
      }
    }
  }

  if (processed === nodeIds.length) {
    return [];
  }

  return nodeIds
    .filter((nodeId) => (indegree.get(nodeId) || 0) > 0)
    .sort();
}

function findUnreachableNodes(
  startNodeId: string,
  nodeIds: string[],
  adjacency: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const stack: string[] = [startNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    for (const target of adjacency.get(nodeId) || []) {
      if (!visited.has(target)) {
        stack.push(target);
      }
    }
  }

  return nodeIds.filter((nodeId) => !visited.has(nodeId)).sort();
}

export function validateWorkflowGraph(input: unknown): WorkflowValidationResult {
  const parsed = workflowGraphSchema.safeParse(input);

  if (!parsed.success) {
    return {
      valid: false,
      errors: sortErrors(
        parsed.error.issues.map((issue) => ({
          code: "SCHEMA_INVALID",
          message: issue.message,
          path: formatPath(issue.path as (string | number)[]),
        }))
      ),
    };
  }

  const graph = parsed.data;
  const errors: WorkflowValidationError[] = [];

  if (graph.nodes.length === 0) {
    errors.push({
      code: "WORKFLOW_EMPTY",
      message: "Workflow must include at least one node.",
      path: "nodes",
    });
    return { valid: false, errors: sortErrors(errors) };
  }

  const nodeIdCounts = mapNodeCounts(graph.nodes);
  const edgeIdCounts = mapEdgeCounts(graph.edges);
  const nodeIds = Array.from(nodeIdCounts.keys()).sort();
  const nodeIdSet = new Set(nodeIds);

  for (const [nodeId, count] of nodeIdCounts.entries()) {
    if (count > 1) {
      errors.push({
        code: "NODE_ID_DUPLICATE",
        message: `Node ID "${nodeId}" is used more than once.`,
        node_id: nodeId,
        path: "nodes",
      });
    }
  }

  for (const [edgeId, count] of edgeIdCounts.entries()) {
    if (count > 1) {
      errors.push({
        code: "EDGE_ID_DUPLICATE",
        message: `Edge ID "${edgeId}" is used more than once.`,
        edge_id: edgeId,
        path: "edges",
      });
    }
  }

  const triggerNodes = graph.nodes
    .filter((node) => node.type === "trigger")
    .map((node) => node.id)
    .sort();
  const endNodes = graph.nodes
    .filter((node) => node.type === "end")
    .map((node) => node.id)
    .sort();

  if (triggerNodes.length === 0) {
    errors.push({
      code: "TRIGGER_NODE_MISSING",
      message: "Workflow must contain exactly one trigger node.",
      path: "nodes",
    });
  } else if (triggerNodes.length > 1) {
    errors.push({
      code: "TRIGGER_NODE_MULTIPLE",
      message: `Workflow has multiple trigger nodes: ${triggerNodes.join(", ")}.`,
      path: "nodes",
    });
  }

  if (endNodes.length === 0) {
    errors.push({
      code: "END_NODE_MISSING",
      message: "Workflow must contain at least one end node.",
      path: "nodes",
    });
  }

  for (const edge of graph.edges) {
    if (!nodeIdSet.has(edge.source)) {
      errors.push({
        code: "EDGE_SOURCE_MISSING",
        message: `Edge "${edge.id}" references missing source node "${edge.source}".`,
        edge_id: edge.id,
        path: "edges",
      });
    }

    if (!nodeIdSet.has(edge.target)) {
      errors.push({
        code: "EDGE_TARGET_MISSING",
        message: `Edge "${edge.id}" references missing target node "${edge.target}".`,
        edge_id: edge.id,
        path: "edges",
      });
    }

    if (edge.source === edge.target) {
      errors.push({
        code: "EDGE_SELF_LOOP",
        message: `Edge "${edge.id}" cannot connect a node to itself.`,
        edge_id: edge.id,
        node_id: edge.source,
        path: "edges",
      });
    }
  }

  for (const conditionNode of graph.nodes
    .filter((node) => node.type === "condition")
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const outgoing = graph.edges.filter((edge) => edge.source === conditionNode.id);
    const hasTrueBranch = outgoing.some((edge) => edge.when === "true");
    const hasFalseBranch = outgoing.some((edge) => edge.when === "false");
    const hasAlwaysBranch = outgoing.some((edge) => edge.when === "always");

    if (hasAlwaysBranch) {
      errors.push({
        code: "CONDITION_EDGE_REQUIRES_BRANCH",
        message:
          "Condition node edges must use true/false branch conditions, not always.",
        node_id: conditionNode.id,
        path: "edges",
      });
    }

    if (!hasTrueBranch) {
      errors.push({
        code: "CONDITION_BRANCH_MISSING_TRUE",
        message: "Condition node is missing a true branch.",
        node_id: conditionNode.id,
        path: "edges",
      });
    }

    if (!hasFalseBranch) {
      errors.push({
        code: "CONDITION_BRANCH_MISSING_FALSE",
        message: "Condition node is missing a false branch.",
        node_id: conditionNode.id,
        path: "edges",
      });
    }
  }

  const adjacency = buildAdjacency(graph, nodeIdSet);

  if (triggerNodes.length === 1) {
    const unreachableNodeIds = findUnreachableNodes(
      triggerNodes[0],
      nodeIds,
      adjacency
    );
    for (const unreachableNodeId of unreachableNodeIds) {
      errors.push({
        code: "UNREACHABLE_NODE",
        message: `Node "${unreachableNodeId}" is unreachable from the trigger.`,
        node_id: unreachableNodeId,
        path: "nodes",
      });
    }
  }

  const cycleNodeIds = findCycleNodes(nodeIds, adjacency);
  if (cycleNodeIds.length > 0) {
    errors.push({
      code: "CYCLE_DETECTED",
      message: `Cycle detected in workflow graph: ${cycleNodeIds.join(", ")}.`,
      path: "edges",
    });
  }

  const sortedErrors = sortErrors(errors);
  return {
    valid: sortedErrors.length === 0,
    errors: sortedErrors,
  };
}

export type WorkflowNodeInput = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdgeInput = z.infer<typeof workflowEdgeSchema>;
export type WorkflowGraphInput = z.infer<typeof workflowGraphSchema>;
export type WorkflowValidateRequest = z.infer<typeof workflowValidateRequestSchema>;
export type CreateWorkflowRequest = z.infer<typeof createWorkflowRequestSchema>;
export type UpdateWorkflowRequest = z.infer<typeof updateWorkflowRequestSchema>;
export type CloneWorkflowRequest = z.infer<typeof cloneWorkflowRequestSchema>;
export type WorkflowNLDraftRequest = z.infer<typeof workflowNLDraftRequestSchema>;
export type WorkflowExperimentRequest = z.infer<
  typeof workflowExperimentRequestSchema
>;
export type WorkflowPromotionRequest = z.infer<
  typeof workflowPromotionRequestSchema
>;
export type CreateWorkflowPlaybookRequest = z.infer<
  typeof createWorkflowPlaybookRequestSchema
>;
export type InstallWorkflowPlaybookRequest = z.infer<
  typeof installWorkflowPlaybookRequestSchema
>;
export type ListWorkflowPlaybooksQuery = z.infer<
  typeof listWorkflowPlaybooksQuerySchema
>;
export type CreateWorkflowRunRequest = z.infer<
  typeof createWorkflowRunRequestSchema
>;
export type ListWorkflowRunsQuery = z.infer<typeof listWorkflowRunsQuerySchema>;
export type WorkflowRunCancelRequest = z.infer<
  typeof workflowRunCancelRequestSchema
>;
export type WorkflowRunRetryStepRequest = z.infer<
  typeof workflowRunRetryStepRequestSchema
>;
export type WorkflowRollbackRequest = z.infer<typeof workflowRollbackRequestSchema>;
export type WorkflowStatusMutationRequest = z.infer<
  typeof workflowStatusMutationRequestSchema
>;
export type IngestWorkflowPerformanceMetricRequest = z.infer<
  typeof ingestWorkflowPerformanceMetricRequestSchema
>;
export type WorkflowPerformanceSummaryQuery = z.infer<
  typeof workflowPerformanceSummaryQuerySchema
>;
export type WorkflowLaunchReadinessSnapshotsQuery = z.infer<
  typeof workflowLaunchReadinessSnapshotsQuerySchema
>;
export type WorkflowLaunchReadinessCaptureRequest = z.infer<
  typeof workflowLaunchReadinessCaptureRequestSchema
>;
