import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_EDGE_CONDITIONS,
  WORKFLOW_NODE_TYPES,
  type WorkflowEdgeCondition,
  type WorkflowNodeType,
} from "@/types/workflow";

const WORKFLOW_NODE_TYPE_VALUES = new Set<WorkflowNodeType>(WORKFLOW_NODE_TYPES);
const WORKFLOW_EDGE_CONDITION_VALUES = new Set<WorkflowEdgeCondition>(
  WORKFLOW_EDGE_CONDITIONS
);

interface WorkflowDraftVersionRow {
  id: string;
  draft_version: number;
}

interface WorkflowNodeRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  node_index: number;
  node_id: string;
  node_type: string;
  label: string | null;
  position_x: number | null;
  position_y: number | null;
  config: unknown;
  created_at: string;
  updated_at: string;
}

interface WorkflowEdgeRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  edge_index: number;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_when: string;
  created_at: string;
  updated_at: string;
}

export type WorkflowGraphNodeKind = WorkflowNodeType | "unknown";
export type WorkflowGraphEdgeKind = WorkflowEdgeCondition | "unknown";

export interface WorkflowGraphNodeRecord {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  node_index: number;
  node_id: string;
  node_type: WorkflowGraphNodeKind;
  label: string | null;
  position_x: number | null;
  position_y: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowGraphEdgeRecord {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  draft_version: number;
  edge_index: number;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_when: WorkflowGraphEdgeKind;
  created_at: string;
  updated_at: string;
}

interface WorkflowGraphQueryScope {
  workflowId: string;
  instanceId: string;
  customerId: string;
  draftVersion?: number;
}

interface WorkflowNodeFilterOptions extends WorkflowGraphQueryScope {
  nodeTypes?: WorkflowNodeType[];
  nodeIds?: string[];
  limit?: number;
}

interface WorkflowEdgeFilterOptions extends WorkflowGraphQueryScope {
  edgeConditions?: WorkflowEdgeCondition[];
  sourceNodeIds?: string[];
  targetNodeIds?: string[];
  limit?: number;
}

export interface WorkflowGraphSnapshot {
  workflow_id: string;
  draft_version: number;
  nodes: WorkflowGraphNodeRecord[];
  edges: WorkflowGraphEdgeRecord[];
}

export interface WorkflowGraphAnalyticsSummary {
  workflow_id: string;
  draft_version: number;
  node_count: number;
  edge_count: number;
  node_type_counts: Record<WorkflowGraphNodeKind, number>;
  source_node_count: number;
  sink_node_count: number;
  dangling_edge_count: number;
  max_out_degree: number;
}

const WORKFLOW_NODE_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, draft_version, node_index, node_id, node_type, label, position_x, position_y, config, created_at, updated_at";
const WORKFLOW_EDGE_SELECT_COLUMNS =
  "id, workflow_id, instance_id, customer_id, draft_version, edge_index, edge_id, source_node_id, target_node_id, edge_when, created_at, updated_at";

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeWorkflowNodeType(value: string): WorkflowGraphNodeKind {
  if (WORKFLOW_NODE_TYPE_VALUES.has(value as WorkflowNodeType)) {
    return value as WorkflowNodeType;
  }

  return "unknown";
}

function normalizeWorkflowEdgeCondition(value: string): WorkflowGraphEdgeKind {
  if (WORKFLOW_EDGE_CONDITION_VALUES.has(value as WorkflowEdgeCondition)) {
    return value as WorkflowEdgeCondition;
  }

  return "unknown";
}

function normalizeWorkflowNodeRow(row: WorkflowNodeRow): WorkflowGraphNodeRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    draft_version: row.draft_version,
    node_index: row.node_index,
    node_id: row.node_id,
    node_type: normalizeWorkflowNodeType(row.node_type),
    label: row.label,
    position_x: row.position_x,
    position_y: row.position_y,
    config: normalizeObject(row.config),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeWorkflowEdgeRow(row: WorkflowEdgeRow): WorkflowGraphEdgeRecord {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    draft_version: row.draft_version,
    edge_index: row.edge_index,
    edge_id: row.edge_id,
    source_node_id: row.source_node_id,
    target_node_id: row.target_node_id,
    edge_when: normalizeWorkflowEdgeCondition(row.edge_when),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeFilterValues(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (normalized.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalized));
}

function normalizeOptionalLimit(limit?: number): number | undefined {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return undefined;
  }

  return Math.max(1, Math.min(2000, Math.floor(limit)));
}

async function resolveWorkflowDraftVersion(
  admin: SupabaseClient,
  scope: WorkflowGraphQueryScope
): Promise<number | null> {
  if (typeof scope.draftVersion === "number" && scope.draftVersion > 0) {
    return Math.floor(scope.draftVersion);
  }

  const { data, error } = await admin
    .from("workflow_definitions")
    .select("id, draft_version")
    .eq("id", scope.workflowId)
    .eq("instance_id", scope.instanceId)
    .eq("customer_id", scope.customerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to resolve workflow draft version")
    );
  }

  if (!data) {
    return null;
  }

  return (data as WorkflowDraftVersionRow).draft_version;
}

export async function listWorkflowGraphNodes(
  admin: SupabaseClient,
  options: WorkflowNodeFilterOptions
): Promise<WorkflowGraphNodeRecord[]> {
  const draftVersion = await resolveWorkflowDraftVersion(admin, options);
  if (draftVersion === null) {
    return [];
  }

  let query = admin
    .from("workflow_nodes")
    .select(WORKFLOW_NODE_SELECT_COLUMNS)
    .eq("workflow_id", options.workflowId)
    .eq("instance_id", options.instanceId)
    .eq("customer_id", options.customerId)
    .eq("draft_version", draftVersion)
    .order("node_index", { ascending: true });

  if (options.nodeTypes && options.nodeTypes.length > 0) {
    query = query.in("node_type", options.nodeTypes);
  }

  const nodeIds = normalizeFilterValues(options.nodeIds);
  if (nodeIds) {
    query = query.in("node_id", nodeIds);
  }

  const limit = normalizeOptionalLimit(options.limit);
  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow nodes"));
  }

  return ((data || []) as WorkflowNodeRow[]).map(normalizeWorkflowNodeRow);
}

export async function listWorkflowGraphEdges(
  admin: SupabaseClient,
  options: WorkflowEdgeFilterOptions
): Promise<WorkflowGraphEdgeRecord[]> {
  const draftVersion = await resolveWorkflowDraftVersion(admin, options);
  if (draftVersion === null) {
    return [];
  }

  let query = admin
    .from("workflow_edges")
    .select(WORKFLOW_EDGE_SELECT_COLUMNS)
    .eq("workflow_id", options.workflowId)
    .eq("instance_id", options.instanceId)
    .eq("customer_id", options.customerId)
    .eq("draft_version", draftVersion)
    .order("edge_index", { ascending: true });

  if (options.edgeConditions && options.edgeConditions.length > 0) {
    query = query.in("edge_when", options.edgeConditions);
  }

  const sourceNodeIds = normalizeFilterValues(options.sourceNodeIds);
  if (sourceNodeIds) {
    query = query.in("source_node_id", sourceNodeIds);
  }

  const targetNodeIds = normalizeFilterValues(options.targetNodeIds);
  if (targetNodeIds) {
    query = query.in("target_node_id", targetNodeIds);
  }

  const limit = normalizeOptionalLimit(options.limit);
  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow edges"));
  }

  return ((data || []) as WorkflowEdgeRow[]).map(normalizeWorkflowEdgeRow);
}

export async function getWorkflowGraphSnapshot(
  admin: SupabaseClient,
  scope: WorkflowGraphQueryScope
): Promise<WorkflowGraphSnapshot | null> {
  const draftVersion = await resolveWorkflowDraftVersion(admin, scope);
  if (draftVersion === null) {
    return null;
  }

  const [nodes, edges] = await Promise.all([
    listWorkflowGraphNodes(admin, {
      ...scope,
      draftVersion,
    }),
    listWorkflowGraphEdges(admin, {
      ...scope,
      draftVersion,
    }),
  ]);

  return {
    workflow_id: scope.workflowId,
    draft_version: draftVersion,
    nodes,
    edges,
  };
}

export async function getWorkflowGraphAnalyticsSummary(
  admin: SupabaseClient,
  scope: WorkflowGraphQueryScope
): Promise<WorkflowGraphAnalyticsSummary | null> {
  const snapshot = await getWorkflowGraphSnapshot(admin, scope);
  if (!snapshot) {
    return null;
  }

  const nodeTypeCounts: Record<WorkflowGraphNodeKind, number> = {
    trigger: 0,
    action: 0,
    condition: 0,
    delay: 0,
    handoff: 0,
    approval: 0,
    end: 0,
    unknown: 0,
  };
  const nodeIdSet = new Set(snapshot.nodes.map((node) => node.node_id));
  const incomingCountByNodeId = new Map<string, number>();
  const outgoingCountByNodeId = new Map<string, number>();
  let danglingEdgeCount = 0;
  let maxOutDegree = 0;

  for (const node of snapshot.nodes) {
    nodeTypeCounts[node.node_type] = (nodeTypeCounts[node.node_type] ?? 0) + 1;
    incomingCountByNodeId.set(node.node_id, 0);
    outgoingCountByNodeId.set(node.node_id, 0);
  }

  for (const edge of snapshot.edges) {
    const sourceExists = nodeIdSet.has(edge.source_node_id);
    const targetExists = nodeIdSet.has(edge.target_node_id);
    if (!sourceExists || !targetExists) {
      danglingEdgeCount += 1;
    }

    outgoingCountByNodeId.set(
      edge.source_node_id,
      (outgoingCountByNodeId.get(edge.source_node_id) || 0) + 1
    );
    incomingCountByNodeId.set(
      edge.target_node_id,
      (incomingCountByNodeId.get(edge.target_node_id) || 0) + 1
    );
  }

  let sourceNodeCount = 0;
  let sinkNodeCount = 0;
  for (const node of snapshot.nodes) {
    const outgoingCount = outgoingCountByNodeId.get(node.node_id) || 0;
    const incomingCount = incomingCountByNodeId.get(node.node_id) || 0;

    if (incomingCount === 0) {
      sourceNodeCount += 1;
    }
    if (outgoingCount === 0) {
      sinkNodeCount += 1;
    }
    if (outgoingCount > maxOutDegree) {
      maxOutDegree = outgoingCount;
    }
  }

  return {
    workflow_id: snapshot.workflow_id,
    draft_version: snapshot.draft_version,
    node_count: snapshot.nodes.length,
    edge_count: snapshot.edges.length,
    node_type_counts: nodeTypeCounts,
    source_node_count: sourceNodeCount,
    sink_node_count: sinkNodeCount,
    dangling_edge_count: danglingEdgeCount,
    max_out_degree: maxOutDegree,
  };
}
