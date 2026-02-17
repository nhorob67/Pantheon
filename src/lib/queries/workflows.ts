import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  type WorkflowDefinition,
  type WorkflowGraph,
  type WorkflowStatus,
  type WorkflowValidationError,
  type WorkflowVersion,
  type WorkflowVersionSource,
} from "@/types/workflow";

const WORKFLOW_STATUS_VALUES = new Set<WorkflowStatus>([
  "draft",
  "published",
  "archived",
]);

const WORKFLOW_VERSION_SOURCE_VALUES = new Set<WorkflowVersionSource>([
  "snapshot",
  "publish",
]);

interface WorkflowDefinitionRow {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  tags?: unknown;
  owner_id?: string | null;
  status: string;
  draft_graph: unknown;
  draft_version: number;
  published_version: number | null;
  is_valid: boolean;
  last_validation_errors: unknown;
  last_validated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowVersionRow {
  id: string;
  workflow_id: string;
  instance_id: string;
  customer_id: string;
  version: number;
  source: string;
  graph: unknown;
  compiled_ir: unknown;
  validation_errors: unknown;
  created_by: string | null;
  created_at: string;
}

function normalizeWorkflowGraph(value: unknown): WorkflowGraph {
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { nodes?: unknown }).nodes) &&
    Array.isArray((value as { edges?: unknown }).edges)
  ) {
    return value as WorkflowGraph;
  }

  return { nodes: [], edges: [] };
}

function normalizeValidationErrors(value: unknown): WorkflowValidationError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as WorkflowValidationError[];
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized));
}

function normalizeWorkflowStatus(value: string): WorkflowStatus {
  if (WORKFLOW_STATUS_VALUES.has(value as WorkflowStatus)) {
    return value as WorkflowStatus;
  }
  return "draft";
}

function normalizeWorkflowVersionSource(value: string): WorkflowVersionSource {
  if (WORKFLOW_VERSION_SOURCE_VALUES.has(value as WorkflowVersionSource)) {
    return value as WorkflowVersionSource;
  }
  return "snapshot";
}

export function normalizeWorkflowDefinitionRow(
  row: WorkflowDefinitionRow
): WorkflowDefinition {
  return {
    id: row.id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    name: row.name,
    description: row.description,
    tags: normalizeTags(row.tags),
    owner_id: row.owner_id ?? null,
    status: normalizeWorkflowStatus(row.status),
    draft_graph: normalizeWorkflowGraph(row.draft_graph),
    draft_version: row.draft_version,
    published_version: row.published_version,
    is_valid: row.is_valid,
    last_validation_errors: normalizeValidationErrors(row.last_validation_errors),
    last_validated_at: row.last_validated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWorkflowVersionRow(row: WorkflowVersionRow): WorkflowVersion {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    version: row.version,
    source: normalizeWorkflowVersionSource(row.source),
    graph: normalizeWorkflowGraph(row.graph),
    compiled_ir:
      typeof row.compiled_ir === "object" && row.compiled_ir !== null
        ? (row.compiled_ir as Record<string, unknown>)
        : null,
    validation_errors: normalizeValidationErrors(row.validation_errors),
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export async function listInstanceWorkflows(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string
): Promise<WorkflowDefinition[]> {
  const { data, error } = await admin
    .from("workflow_definitions")
    .select("id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at")
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflows"));
  }

  return ((data || []) as WorkflowDefinitionRow[]).map(normalizeWorkflowDefinitionRow);
}

export async function getInstanceWorkflowDetail(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  workflowId: string
): Promise<{ workflow: WorkflowDefinition; versions: WorkflowVersion[] } | null> {
  const [workflowResult, versionsResult] = await Promise.all([
    admin
      .from("workflow_definitions")
      .select("id, instance_id, customer_id, name, description, tags, owner_id, status, draft_graph, draft_version, published_version, is_valid, last_validation_errors, last_validated_at, created_by, updated_by, created_at, updated_at")
      .eq("id", workflowId)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .maybeSingle(),
    admin
      .from("workflow_versions")
      .select("id, workflow_id, instance_id, customer_id, version, source, graph, compiled_ir, validation_errors, created_by, created_at")
      .eq("workflow_id", workflowId)
      .eq("instance_id", instanceId)
      .eq("customer_id", customerId)
      .order("version", { ascending: false })
      .limit(25),
  ]);

  if (workflowResult.error) {
    throw new Error(
      safeErrorMessage(workflowResult.error, "Failed to load workflow detail")
    );
  }

  if (versionsResult.error) {
    throw new Error(
      safeErrorMessage(versionsResult.error, "Failed to load workflow versions")
    );
  }

  if (!workflowResult.data) {
    return null;
  }

  return {
    workflow: normalizeWorkflowDefinitionRow(
      workflowResult.data as WorkflowDefinitionRow
    ),
    versions: ((versionsResult.data || []) as WorkflowVersionRow[]).map(
      normalizeWorkflowVersionRow
    ),
  };
}
