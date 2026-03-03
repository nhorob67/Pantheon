import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { sanitizeSearchForOr } from "@/lib/security/postgrest-sanitize";
import {
  WORKFLOW_PLAYBOOK_STATUSES,
  WORKFLOW_PLAYBOOK_VISIBILITIES,
  type WorkflowGraph,
  type WorkflowPlaybook,
  type WorkflowPlaybookStatus,
  type WorkflowPlaybookVersion,
  type WorkflowPlaybookVisibility,
} from "@/types/workflow";

interface WorkflowPlaybookRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  tags: unknown;
  visibility: string;
  status: string;
  source_workflow_id: string | null;
  source_instance_id: string | null;
  customer_id: string | null;
  latest_version: number;
  latest_graph: unknown;
  metadata: unknown;
  install_count: number;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowPlaybookVersionRow {
  id: string;
  playbook_id: string;
  version: number;
  graph: unknown;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
}

const WORKFLOW_PLAYBOOK_STATUS_VALUES = new Set<WorkflowPlaybookStatus>(
  WORKFLOW_PLAYBOOK_STATUSES
);
const WORKFLOW_PLAYBOOK_VISIBILITY_VALUES = new Set<WorkflowPlaybookVisibility>(
  WORKFLOW_PLAYBOOK_VISIBILITIES
);

const WORKFLOW_PLAYBOOK_SELECT_COLUMNS =
  "id, slug, name, description, summary, category, tags, visibility, status, source_workflow_id, source_instance_id, customer_id, latest_version, latest_graph, metadata, install_count, created_by, updated_by, published_at, created_at, updated_at";

const WORKFLOW_PLAYBOOK_VERSION_SELECT_COLUMNS =
  "id, playbook_id, version, graph, metadata, created_by, created_at";

function normalizeWorkflowGraph(value: unknown): WorkflowGraph {
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { nodes?: unknown }).nodes) &&
    Array.isArray((value as { edges?: unknown }).edges)
  ) {
    return value as WorkflowGraph;
  }

  return {
    nodes: [],
    edges: [],
  };
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(normalized));
}

function normalizeWorkflowPlaybookStatus(value: string): WorkflowPlaybookStatus {
  if (WORKFLOW_PLAYBOOK_STATUS_VALUES.has(value as WorkflowPlaybookStatus)) {
    return value as WorkflowPlaybookStatus;
  }

  return "draft";
}

function normalizeWorkflowPlaybookVisibility(
  value: string
): WorkflowPlaybookVisibility {
  if (
    WORKFLOW_PLAYBOOK_VISIBILITY_VALUES.has(value as WorkflowPlaybookVisibility)
  ) {
    return value as WorkflowPlaybookVisibility;
  }

  return "private";
}

function applySearchFilter(
  query: {
    or: (filter: string) => unknown;
  },
  search: string | undefined
): void {
  if (!search) {
    return;
  }

  const escaped = sanitizeSearchForOr(search);
  if (escaped.length === 0) {
    return;
  }

  query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
}

export function normalizeWorkflowPlaybookRow(row: WorkflowPlaybookRow): WorkflowPlaybook {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    summary: row.summary,
    category: row.category,
    tags: normalizeTags(row.tags),
    visibility: normalizeWorkflowPlaybookVisibility(row.visibility),
    status: normalizeWorkflowPlaybookStatus(row.status),
    source_workflow_id: row.source_workflow_id,
    source_instance_id: row.source_instance_id,
    customer_id: row.customer_id,
    latest_version: row.latest_version,
    graph: normalizeWorkflowGraph(row.latest_graph),
    metadata: normalizeObject(row.metadata),
    install_count: typeof row.install_count === "number" ? row.install_count : 0,
    created_by: row.created_by,
    updated_by: row.updated_by,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWorkflowPlaybookVersionRow(
  row: WorkflowPlaybookVersionRow
): WorkflowPlaybookVersion {
  return {
    id: row.id,
    playbook_id: row.playbook_id,
    version: row.version,
    graph: normalizeWorkflowGraph(row.graph),
    metadata: normalizeObject(row.metadata),
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export async function listPublishedMarketplacePlaybooks(
  admin: SupabaseClient,
  options?: {
    search?: string;
    category?: string;
    limit?: number;
  }
): Promise<WorkflowPlaybook[]> {
  const limit = Math.max(1, Math.min(100, Math.trunc(options?.limit ?? 40)));

  let query = admin
    .from("workflow_playbooks")
    .select(WORKFLOW_PLAYBOOK_SELECT_COLUMNS)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (options?.category && options.category.trim().length > 0) {
    query = query.eq("category", options.category.trim());
  }

  applySearchFilter(query, options?.search);

  const { data, error } = await query;

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow playbooks"));
  }

  return ((data || []) as WorkflowPlaybookRow[]).map(normalizeWorkflowPlaybookRow);
}

export async function listCustomerWorkflowPlaybooks(
  admin: SupabaseClient,
  customerId: string,
  options?: {
    search?: string;
    category?: string;
    status?: WorkflowPlaybookStatus;
    visibility?: WorkflowPlaybookVisibility;
    limit?: number;
  }
): Promise<WorkflowPlaybook[]> {
  const limit = Math.max(1, Math.min(100, Math.trunc(options?.limit ?? 40)));

  let query = admin
    .from("workflow_playbooks")
    .select(WORKFLOW_PLAYBOOK_SELECT_COLUMNS)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (options?.category && options.category.trim().length > 0) {
    query = query.eq("category", options.category.trim());
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.visibility) {
    query = query.eq("visibility", options.visibility);
  }

  applySearchFilter(query, options?.search);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load customer workflow playbooks")
    );
  }

  return ((data || []) as WorkflowPlaybookRow[]).map(normalizeWorkflowPlaybookRow);
}

export async function getWorkflowPlaybookById(
  admin: SupabaseClient,
  playbookId: string
): Promise<WorkflowPlaybook | null> {
  const { data, error } = await admin
    .from("workflow_playbooks")
    .select(WORKFLOW_PLAYBOOK_SELECT_COLUMNS)
    .eq("id", playbookId)
    .maybeSingle();

  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to load workflow playbook"));
  }

  if (!data) {
    return null;
  }

  return normalizeWorkflowPlaybookRow(data as WorkflowPlaybookRow);
}

export async function getWorkflowPlaybookVersion(
  admin: SupabaseClient,
  playbookId: string,
  version: number
): Promise<WorkflowPlaybookVersion | null> {
  const { data, error } = await admin
    .from("workflow_playbook_versions")
    .select(WORKFLOW_PLAYBOOK_VERSION_SELECT_COLUMNS)
    .eq("playbook_id", playbookId)
    .eq("version", version)
    .maybeSingle();

  if (error) {
    throw new Error(
      safeErrorMessage(error, "Failed to load workflow playbook version")
    );
  }

  if (!data) {
    return null;
  }

  return normalizeWorkflowPlaybookVersionRow(data as WorkflowPlaybookVersionRow);
}
