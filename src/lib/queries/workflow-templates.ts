import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import {
  WORKFLOW_TEMPLATE_KINDS,
  type WorkflowGraph,
  type WorkflowTemplate,
  type WorkflowTemplateKind,
} from "@/types/workflow";

const WORKFLOW_TEMPLATE_KIND_VALUES = new Set<WorkflowTemplateKind>(
  WORKFLOW_TEMPLATE_KINDS
);

interface WorkflowTemplateRow {
  id: string;
  instance_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  template_kind: string;
  latest_version: number;
  latest_graph: unknown;
  metadata: unknown;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
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

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeWorkflowTemplateKind(value: string): WorkflowTemplateKind {
  if (WORKFLOW_TEMPLATE_KIND_VALUES.has(value as WorkflowTemplateKind)) {
    return value as WorkflowTemplateKind;
  }

  return "custom";
}

export function normalizeWorkflowTemplateRow(
  row: WorkflowTemplateRow
): WorkflowTemplate {
  return {
    id: row.id,
    instance_id: row.instance_id,
    customer_id: row.customer_id,
    name: row.name,
    description: row.description,
    template_kind: normalizeWorkflowTemplateKind(row.template_kind),
    latest_version: row.latest_version,
    graph: normalizeWorkflowGraph(row.latest_graph),
    metadata: normalizeObject(row.metadata),
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const WORKFLOW_TEMPLATE_SELECT_COLUMNS =
  "id, instance_id, customer_id, name, description, template_kind, latest_version, latest_graph, metadata, created_by, updated_by, created_at, updated_at";

export async function listInstanceWorkflowTemplates(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string
): Promise<WorkflowTemplate[]> {
  const { data, error } = await admin
    .from("workflow_templates")
    .select(WORKFLOW_TEMPLATE_SELECT_COLUMNS)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow templates"));
  }

  return ((data || []) as WorkflowTemplateRow[]).map(normalizeWorkflowTemplateRow);
}

export async function getInstanceWorkflowTemplate(
  admin: SupabaseClient,
  instanceId: string,
  customerId: string,
  templateId: string
): Promise<WorkflowTemplate | null> {
  const { data, error } = await admin
    .from("workflow_templates")
    .select(WORKFLOW_TEMPLATE_SELECT_COLUMNS)
    .eq("id", templateId)
    .eq("instance_id", instanceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow template"));
  }

  if (!data) {
    return null;
  }

  return normalizeWorkflowTemplateRow(data as WorkflowTemplateRow);
}
