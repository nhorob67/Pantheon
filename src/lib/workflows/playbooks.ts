import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getWorkflowPlaybookById,
  getWorkflowPlaybookVersion,
  listCustomerWorkflowPlaybooks,
  listPublishedMarketplacePlaybooks,
  normalizeWorkflowPlaybookRow,
  normalizeWorkflowPlaybookVersionRow,
} from "@/lib/queries/workflow-playbooks";
import { normalizeWorkflowDefinitionRow } from "@/lib/queries/workflows";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { validateWorkflowGraph } from "@/lib/validators/workflow";
import type {
  WorkflowDefinition,
  WorkflowPlaybook,
  WorkflowPlaybookStatus,
  WorkflowPlaybookVersion,
  WorkflowPlaybookVisibility,
} from "@/types/workflow";

export interface PublishWorkflowAsPlaybookInput {
  instanceId: string;
  customerId: string;
  workflowId: string;
  slug: string;
  name: string;
  description?: string | null;
  summary?: string | null;
  category?: string | null;
  tags?: string[];
  visibility: WorkflowPlaybookVisibility;
  status: WorkflowPlaybookStatus;
  metadata?: Record<string, unknown>;
  actorId: string;
}

export interface InstallWorkflowPlaybookInput {
  instanceId: string;
  customerId: string;
  playbookId: string;
  actorId: string;
  name?: string;
  description?: string | null;
  tags?: string[];
  ownerId?: string | null;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return [];
  }

  const normalized = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 20);

  return Array.from(new Set(normalized));
}

function normalizeSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  if (normalized.length < 3) {
    throw new Error("Playbook slug must be at least 3 characters.");
  }

  return normalized;
}

function normalizeNullableText(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mergePlaybooks(...groups: WorkflowPlaybook[][]): WorkflowPlaybook[] {
  const deduped = new Map<string, WorkflowPlaybook>();

  for (const group of groups) {
    for (const playbook of group) {
      if (!deduped.has(playbook.id)) {
        deduped.set(playbook.id, playbook);
      }
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const aPublishedAt = a.published_at || "";
    const bPublishedAt = b.published_at || "";

    if (aPublishedAt !== bPublishedAt) {
      return bPublishedAt.localeCompare(aPublishedAt);
    }

    return b.updated_at.localeCompare(a.updated_at);
  });
}

export async function listWorkflowPlaybookCatalog(
  admin: SupabaseClient,
  input: {
    customerId: string;
    includeOwned: boolean;
    search?: string;
    category?: string;
    status?: WorkflowPlaybookStatus;
    visibility?: WorkflowPlaybookVisibility;
    limit?: number;
  }
): Promise<WorkflowPlaybook[]> {
  const marketplacePromise = listPublishedMarketplacePlaybooks(admin, {
    search: input.search,
    category: input.category,
    limit: input.limit,
  });

  if (!input.includeOwned) {
    return marketplacePromise;
  }

  const [marketplace, owned] = await Promise.all([
    marketplacePromise,
    listCustomerWorkflowPlaybooks(admin, input.customerId, {
      search: input.search,
      category: input.category,
      status: input.status,
      visibility: input.visibility,
      limit: input.limit,
    }),
  ]);

  return mergePlaybooks(marketplace, owned);
}

export async function publishWorkflowAsPlaybook(
  admin: SupabaseClient,
  input: PublishWorkflowAsPlaybookInput
): Promise<{
  playbook: WorkflowPlaybook;
  version: WorkflowPlaybookVersion;
  created: boolean;
}> {
  const normalizedSlug = normalizeSlug(input.slug);

  const { data: workflowRow, error: workflowError } = await admin
    .from("workflow_definitions")
    .select("id, instance_id, customer_id, name, description, status, published_version, draft_graph, is_valid")
    .eq("id", input.workflowId)
    .eq("instance_id", input.instanceId)
    .eq("customer_id", input.customerId)
    .maybeSingle();

  if (workflowError) {
    throw new Error(safeErrorMessage(workflowError, "Failed to load workflow"));
  }

  if (!workflowRow) {
    throw new Error("Workflow not found.");
  }

  if (workflowRow.status !== "published" || !workflowRow.published_version) {
    throw new Error(
      "Publish the workflow first before creating a reusable playbook."
    );
  }

  const { data: versionRow, error: versionError } = await admin
    .from("workflow_versions")
    .select("graph")
    .eq("workflow_id", input.workflowId)
    .eq("instance_id", input.instanceId)
    .eq("customer_id", input.customerId)
    .eq("version", workflowRow.published_version)
    .maybeSingle();

  if (versionError) {
    throw new Error(
      safeErrorMessage(versionError, "Failed to load published workflow version")
    );
  }

  const graph = (versionRow?.graph ?? workflowRow.draft_graph) as {
    nodes?: unknown;
    edges?: unknown;
  };

  const validation = validateWorkflowGraph(graph);
  if (!validation.valid) {
    throw new Error("Published workflow graph is invalid and cannot be playbookized.");
  }

  const normalizedDescription =
    normalizeNullableText(input.description, 1000) ?? workflowRow.description;
  const normalizedSummary = normalizeNullableText(input.summary, 280);
  const normalizedCategory = normalizeNullableText(input.category, 80);
  const normalizedTags = normalizeTags(input.tags);
  const baseMetadata = {
    ...normalizeMetadata(input.metadata),
    source_workflow_id: input.workflowId,
    source_published_version: workflowRow.published_version,
    published_via: "workflow_playbook_publish_api",
  };

  const { data: existingPlaybookRow, error: existingPlaybookError } = await admin
    .from("workflow_playbooks")
    .select(
      "id, slug, name, description, summary, category, tags, visibility, status, source_workflow_id, source_instance_id, customer_id, latest_version, latest_graph, metadata, install_count, created_by, updated_by, published_at, created_at, updated_at"
    )
    .ilike("slug", normalizedSlug)
    .maybeSingle();

  if (existingPlaybookError) {
    throw new Error(
      safeErrorMessage(existingPlaybookError, "Failed to load existing playbook")
    );
  }

  const nextStatus: WorkflowPlaybookStatus = input.status;
  const nextVisibility: WorkflowPlaybookVisibility = input.visibility;
  const publishedAt = nextStatus === "published" ? new Date().toISOString() : null;

  if (existingPlaybookRow) {
    if (existingPlaybookRow.customer_id !== input.customerId) {
      throw new Error("Playbook slug is already in use.");
    }

    const nextVersion = (existingPlaybookRow.latest_version || 0) + 1;

    const { data: updatedPlaybookRow, error: updatePlaybookError } = await admin
      .from("workflow_playbooks")
      .update({
        name: input.name,
        description: normalizedDescription,
        summary: normalizedSummary,
        category: normalizedCategory,
        tags: normalizedTags,
        visibility: nextVisibility,
        status: nextStatus,
        source_workflow_id: input.workflowId,
        source_instance_id: input.instanceId,
        latest_version: nextVersion,
        latest_graph: graph,
        metadata: baseMetadata,
        updated_by: input.actorId,
        published_at: publishedAt,
      })
      .eq("id", existingPlaybookRow.id)
      .select(
        "id, slug, name, description, summary, category, tags, visibility, status, source_workflow_id, source_instance_id, customer_id, latest_version, latest_graph, metadata, install_count, created_by, updated_by, published_at, created_at, updated_at"
      )
      .single();

    if (updatePlaybookError || !updatedPlaybookRow) {
      throw new Error(
        safeErrorMessage(updatePlaybookError, "Failed to update workflow playbook")
      );
    }

    const { data: insertedVersionRow, error: insertVersionError } = await admin
      .from("workflow_playbook_versions")
      .insert({
        playbook_id: existingPlaybookRow.id,
        version: nextVersion,
        graph,
        metadata: baseMetadata,
        created_by: input.actorId,
      })
      .select("id, playbook_id, version, graph, metadata, created_by, created_at")
      .single();

    if (insertVersionError || !insertedVersionRow) {
      throw new Error(
        safeErrorMessage(insertVersionError, "Failed to append workflow playbook version")
      );
    }

    return {
      playbook: normalizeWorkflowPlaybookRow(
        updatedPlaybookRow as Parameters<typeof normalizeWorkflowPlaybookRow>[0]
      ),
      version: normalizeWorkflowPlaybookVersionRow(
        insertedVersionRow as Parameters<typeof normalizeWorkflowPlaybookVersionRow>[0]
      ),
      created: false,
    };
  }

  const { data: createdPlaybookRow, error: createPlaybookError } = await admin
    .from("workflow_playbooks")
    .insert({
      slug: normalizedSlug,
      name: input.name,
      description: normalizedDescription,
      summary: normalizedSummary,
      category: normalizedCategory,
      tags: normalizedTags,
      visibility: nextVisibility,
      status: nextStatus,
      source_workflow_id: input.workflowId,
      source_instance_id: input.instanceId,
      customer_id: input.customerId,
      latest_version: 1,
      latest_graph: graph,
      metadata: baseMetadata,
      install_count: 0,
      created_by: input.actorId,
      updated_by: input.actorId,
      published_at: publishedAt,
    })
    .select(
      "id, slug, name, description, summary, category, tags, visibility, status, source_workflow_id, source_instance_id, customer_id, latest_version, latest_graph, metadata, install_count, created_by, updated_by, published_at, created_at, updated_at"
    )
    .single();

  if (createPlaybookError || !createdPlaybookRow) {
    throw new Error(
      safeErrorMessage(createPlaybookError, "Failed to create workflow playbook")
    );
  }

  const { data: createdVersionRow, error: createVersionError } = await admin
    .from("workflow_playbook_versions")
    .insert({
      playbook_id: createdPlaybookRow.id,
      version: 1,
      graph,
      metadata: baseMetadata,
      created_by: input.actorId,
    })
    .select("id, playbook_id, version, graph, metadata, created_by, created_at")
    .single();

  if (createVersionError || !createdVersionRow) {
    throw new Error(
      safeErrorMessage(createVersionError, "Failed to create workflow playbook version")
    );
  }

  return {
    playbook: normalizeWorkflowPlaybookRow(
      createdPlaybookRow as Parameters<typeof normalizeWorkflowPlaybookRow>[0]
    ),
    version: normalizeWorkflowPlaybookVersionRow(
      createdVersionRow as Parameters<typeof normalizeWorkflowPlaybookVersionRow>[0]
    ),
    created: true,
  };
}

function canInstallPlaybook(input: {
  playbook: WorkflowPlaybook;
  customerId: string;
}): boolean {
  const isOwner = input.playbook.customer_id === input.customerId;
  if (isOwner) {
    return true;
  }

  return (
    input.playbook.status === "published" &&
    input.playbook.visibility === "public"
  );
}

export async function installWorkflowPlaybook(
  admin: SupabaseClient,
  input: InstallWorkflowPlaybookInput
): Promise<{
  workflow: WorkflowDefinition;
  playbook: WorkflowPlaybook;
}> {
  const playbook = await getWorkflowPlaybookById(admin, input.playbookId);
  if (!playbook) {
    throw new Error("Workflow playbook not found.");
  }

  if (!canInstallPlaybook({ playbook, customerId: input.customerId })) {
    throw new Error("You do not have access to install this playbook.");
  }

  const playbookVersion = await getWorkflowPlaybookVersion(
    admin,
    playbook.id,
    playbook.latest_version
  );

  if (!playbookVersion) {
    throw new Error("Workflow playbook version not found.");
  }

  const validation = validateWorkflowGraph(playbookVersion.graph);
  if (!validation.valid) {
    throw new Error("Workflow playbook graph is invalid.");
  }

  const workflowName =
    input.name && input.name.trim().length > 0
      ? input.name.trim()
      : `${playbook.name} (Installed)`;
  const workflowDescription =
    input.description === undefined
      ? playbook.description
      : input.description;

  const { data: createdWorkflowRow, error: createdWorkflowError } = await admin.rpc(
    "create_workflow_definition_with_snapshot",
    {
      p_instance_id: input.instanceId,
      p_customer_id: input.customerId,
      p_name: workflowName,
      p_description: workflowDescription ?? null,
      p_graph: playbookVersion.graph,
      p_created_by: input.actorId,
      p_is_valid: validation.valid,
      p_validation_errors: validation.errors,
      p_tags: normalizeTags(input.tags),
      p_owner_id: input.ownerId ?? input.actorId,
    }
  );

  if (createdWorkflowError) {
    throw new Error(
      safeErrorMessage(createdWorkflowError, "Failed to install workflow playbook")
    );
  }

  const workflowRow = Array.isArray(createdWorkflowRow)
    ? createdWorkflowRow[0]
    : createdWorkflowRow;

  if (!workflowRow) {
    throw new Error("Workflow created from playbook, but payload was empty.");
  }

  const { error: installError } = await admin.from("workflow_playbook_installs").insert({
    playbook_id: playbook.id,
    playbook_version: playbookVersion.version,
    workflow_id: workflowRow.id,
    instance_id: input.instanceId,
    customer_id: input.customerId,
    installed_by: input.actorId,
    metadata: {
      install_source: "workflow_playbook_install_api",
      playbook_slug: playbook.slug,
    },
  });

  if (installError) {
    throw new Error(
      safeErrorMessage(installError, "Failed to persist playbook install event")
    );
  }

  const { error: installCountError } = await admin
    .from("workflow_playbooks")
    .update({
      install_count: playbook.install_count + 1,
      updated_by: input.actorId,
    })
    .eq("id", playbook.id);

  if (installCountError) {
    throw new Error(
      safeErrorMessage(installCountError, "Failed to update playbook install count")
    );
  }

  return {
    workflow: normalizeWorkflowDefinitionRow(
      workflowRow as Parameters<typeof normalizeWorkflowDefinitionRow>[0]
    ),
    playbook,
  };
}

export function buildWorkflowPlaybookSlug(value: string): string {
  return normalizeSlug(value);
}
