import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFile } from "@/lib/knowledge/parser";
import { validateFileTypeMatchesMagicBytes } from "@/lib/knowledge/detect-file-type";
import { safeErrorMessage } from "@/lib/security/safe-error";

import { tasks } from "@trigger.dev/sdk";
import type { indexKnowledgeDocumentTask } from "@/trigger/index-knowledge-document";
import { removeKnowledgeIndex } from "@/lib/ai/knowledge-indexer";
import {
  KNOWLEDGE_FILE_TYPES,
  MAX_RAW_FILE_SIZE,
  MAX_FILES_PER_INSTANCE,
  MAX_TOTAL_PARSED_SIZE,
  MIME_TO_FILE_TYPE,
  type KnowledgeFileType,
} from "@/types/knowledge";

const TENANT_KNOWLEDGE_SELECT =
  "id, tenant_id, customer_id, legacy_knowledge_file_id, title, source_type, mime_type, storage_bucket, storage_path, content_hash, status, metadata, indexed_at, created_at, updated_at";
const LEGACY_KNOWLEDGE_SELECT =
  "id, customer_id, instance_id, agent_id, file_name, file_type, file_size_bytes, storage_path, parsed_size_bytes, status, error_message, created_at, updated_at";

const FILE_TYPE_SET = new Set<string>(KNOWLEDGE_FILE_TYPES);
const FILE_TYPE_TO_MIME: Record<KnowledgeFileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  txt: "text/plain",
};
const MIME_TO_FILE_TYPE_SAFE: Record<string, KnowledgeFileType> = MIME_TO_FILE_TYPE;

interface TenantKnowledgeRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_knowledge_file_id: string | null;
  title: string;
  source_type: string;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  content_hash: string | null;
  status: string;
  metadata: unknown;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyKnowledgeRow {
  id: string;
  customer_id: string;
  instance_id: string;
  agent_id: string | null;
  file_name: string;
  file_type: KnowledgeFileType;
  file_size_bytes: number;
  storage_path: string;
  parsed_size_bytes: number;
  status: "active" | "processing" | "failed" | "archived";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TenantKnowledgeMetadata {
  agent_id: string | null;
  file_type: KnowledgeFileType;
  file_size_bytes: number;
  parsed_size_bytes: number;
  error_message: string | null;
}

export interface TenantKnowledgeMutationContext {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export interface TenantKnowledgeFileMeta {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_knowledge_file_id: string | null;
  agent_id: string | null;
  file_name: string;
  file_type: KnowledgeFileType;
  file_size_bytes: number;
  parsed_size_bytes: number;
  status: "active" | "processing" | "failed" | "archived";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}


export class TenantKnowledgeServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toKnowledgeFileType(value: unknown): KnowledgeFileType {
  if (typeof value === "string" && FILE_TYPE_SET.has(value)) {
    return value as KnowledgeFileType;
  }

  return "txt";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function toKnowledgeStatus(
  value: unknown
): "active" | "processing" | "failed" | "archived" {
  if (
    value === "active" ||
    value === "processing" ||
    value === "failed" ||
    value === "archived"
  ) {
    return value;
  }

  return "active";
}

function parseTenantKnowledgeMetadata(metadata: unknown): TenantKnowledgeMetadata {
  if (!isRecord(metadata)) {
    return {
      agent_id: null,
      file_type: "txt",
      file_size_bytes: 0,
      parsed_size_bytes: 0,
      error_message: null,
    };
  }

  return {
    agent_id: toNullableString(metadata["agent_id"]),
    file_type: toKnowledgeFileType(metadata["file_type"]),
    file_size_bytes: toNonNegativeInt(metadata["file_size_bytes"]),
    parsed_size_bytes: toNonNegativeInt(metadata["parsed_size_bytes"]),
    error_message: toNullableString(metadata["error_message"]),
  };
}

function buildTenantKnowledgeMetadata(input: {
  agentId: string | null;
  fileType: KnowledgeFileType;
  fileSizeBytes: number;
  parsedSizeBytes: number;
  errorMessage?: string | null;
}): Record<string, unknown> {
  return {
    agent_id: input.agentId,
    file_type: input.fileType,
    file_size_bytes: input.fileSizeBytes,
    parsed_size_bytes: input.parsedSizeBytes,
    error_message: input.errorMessage || null,
  };
}

function mapTenantKnowledgeRow(row: TenantKnowledgeRow): TenantKnowledgeFileMeta {
  const metadata = parseTenantKnowledgeMetadata(row.metadata);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    legacy_knowledge_file_id: row.legacy_knowledge_file_id,
    agent_id: metadata.agent_id,
    file_name: row.title,
    file_type: metadata.file_type,
    file_size_bytes: metadata.file_size_bytes,
    parsed_size_bytes: metadata.parsed_size_bytes,
    status: toKnowledgeStatus(row.status),
    error_message: metadata.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}


async function ensureTenantKnowledgeHydratedFromLegacy(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext
): Promise<void> {
  if (!context.legacyInstanceId) {
    return;
  }

  const { count: tenantKnowledgeCount, error: countError } = await admin
    .from("tenant_knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId);

  if (countError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(countError, "Failed to count tenant knowledge items")
    );
  }

  if ((tenantKnowledgeCount || 0) > 0) {
    return;
  }

  const { data: legacyRows, error: legacyError } = await admin
    .from("knowledge_files")
    .select(LEGACY_KNOWLEDGE_SELECT)
    .eq("instance_id", context.legacyInstanceId);

  if (legacyError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(legacyError, "Failed to load legacy knowledge files")
    );
  }

  const legacyKnowledge = (legacyRows || []) as LegacyKnowledgeRow[];
  if (legacyKnowledge.length === 0) {
    return;
  }

  const rowsToInsert = legacyKnowledge.map((legacyRow) => ({
    tenant_id: context.tenantId,
    customer_id: context.customerId,
    legacy_knowledge_file_id: legacyRow.id,
    title: legacyRow.file_name,
    source_type: "file",
    mime_type: FILE_TYPE_TO_MIME[legacyRow.file_type] || null,
    storage_bucket: "knowledge-raw",
    storage_path: legacyRow.storage_path,
    status: legacyRow.status,
    metadata: buildTenantKnowledgeMetadata({
      agentId: legacyRow.agent_id,
      fileType: legacyRow.file_type,
      fileSizeBytes: legacyRow.file_size_bytes,
      parsedSizeBytes: legacyRow.parsed_size_bytes,
      errorMessage: legacyRow.error_message,
    }),
  }));

  const { error: insertError } = await admin
    .from("tenant_knowledge_items")
    .insert(rowsToInsert);

  if (insertError && insertError.code !== "23505") {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(insertError, "Failed to hydrate tenant knowledge items from legacy")
    );
  }
}

async function fetchTenantKnowledgeByIdentifier(
  admin: SupabaseClient,
  tenantId: string,
  fileIdentifier: string
): Promise<TenantKnowledgeRow | null> {
  const { data, error } = await admin
    .from("tenant_knowledge_items")
    .select(TENANT_KNOWLEDGE_SELECT)
    .eq("tenant_id", tenantId)
    .or(`id.eq.${fileIdentifier},legacy_knowledge_file_id.eq.${fileIdentifier}`)
    .maybeSingle();

  if (error) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant knowledge item")
    );
  }

  return (data as TenantKnowledgeRow | null) || null;
}

async function resolveAgentAssignment(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext,
  requestedAgentId: string | null
): Promise<{ metadataAgentId: string | null; legacyAgentId: string | null }> {
  if (!requestedAgentId) {
    return { metadataAgentId: null, legacyAgentId: null };
  }

  const { data: tenantAgent, error } = await admin
    .from("tenant_agents")
    .select("id, legacy_agent_id, status")
    .eq("tenant_id", context.tenantId)
    .or(`id.eq.${requestedAgentId},legacy_agent_id.eq.${requestedAgentId}`)
    .maybeSingle();

  if (error) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant agent assignment")
    );
  }

  const resolvedAgent = tenantAgent as
    | { id: string; legacy_agent_id: string | null; status: string }
    | null;
  if (!resolvedAgent || resolvedAgent.status === "archived") {
    throw new TenantKnowledgeServiceError(400, "Agent not found");
  }

  let legacyAgentId: string | null = resolvedAgent.legacy_agent_id;

  if (context.legacyInstanceId && !legacyAgentId) {
    const { data: legacyAgentByTenantId, error: legacyCheckError } = await admin
      .from("agents")
      .select("id")
      .eq("id", resolvedAgent.id)
      .eq("instance_id", context.legacyInstanceId)
      .maybeSingle();

    if (legacyCheckError) {
      throw new TenantKnowledgeServiceError(
        500,
        safeErrorMessage(legacyCheckError, "Failed to resolve legacy agent assignment")
      );
    }

    if (legacyAgentByTenantId) {
      legacyAgentId = resolvedAgent.id;
    }
  }

  if (context.legacyInstanceId && !legacyAgentId) {
    throw new TenantKnowledgeServiceError(
      400,
      "Agent mapping unavailable for legacy instance sync"
    );
  }

  return {
    metadataAgentId: legacyAgentId || resolvedAgent.id,
    legacyAgentId,
  };
}

async function syncTenantKnowledgeToLegacy(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext,
  tenantRow: TenantKnowledgeRow,
  parsedMarkdown: string
): Promise<TenantKnowledgeRow> {
  if (!context.legacyInstanceId) {
    return tenantRow;
  }

  const metadata = parseTenantKnowledgeMetadata(tenantRow.metadata);

  if (tenantRow.legacy_knowledge_file_id) {
    const { error: updateError } = await admin
      .from("knowledge_files")
      .update({
        agent_id: metadata.agent_id,
        file_name: tenantRow.title,
        file_type: metadata.file_type,
        file_size_bytes: metadata.file_size_bytes,
        storage_path: tenantRow.storage_path,
        parsed_markdown: parsedMarkdown,
        parsed_size_bytes: metadata.parsed_size_bytes,
        status: tenantRow.status,
        error_message: metadata.error_message,
      })
      .eq("id", tenantRow.legacy_knowledge_file_id)
      .eq("instance_id", context.legacyInstanceId);

    if (!updateError) {
      return tenantRow;
    }
  }

  const { data: insertedLegacy, error: insertError } = await admin
    .from("knowledge_files")
    .insert({
      customer_id: context.customerId,
      instance_id: context.legacyInstanceId,
      agent_id: metadata.agent_id,
      file_name: tenantRow.title,
      file_type: metadata.file_type,
      file_size_bytes: metadata.file_size_bytes,
      storage_path: tenantRow.storage_path,
      parsed_markdown: parsedMarkdown,
      parsed_size_bytes: metadata.parsed_size_bytes,
      status: tenantRow.status,
      error_message: metadata.error_message,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(insertError, "Failed to sync tenant knowledge item to legacy")
    );
  }

  const legacyId = (insertedLegacy as { id: string }).id;
  const { data: updatedTenant, error: updateTenantError } = await admin
    .from("tenant_knowledge_items")
    .update({ legacy_knowledge_file_id: legacyId })
    .eq("id", tenantRow.id)
    .select(TENANT_KNOWLEDGE_SELECT)
    .single();

  if (updateTenantError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(updateTenantError, "Failed to update tenant knowledge legacy linkage")
    );
  }

  return updatedTenant as TenantKnowledgeRow;
}

async function countActiveKnowledgeFiles(
  admin: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await admin
    .from("tenant_knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(error, "Failed to count active tenant knowledge files")
    );
  }

  return count || 0;
}

async function resolveTotalParsedSize(
  admin: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data, error } = await admin
    .from("tenant_knowledge_items")
    .select("metadata")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant parsed knowledge size")
    );
  }

  return ((data || []) as Array<{ metadata: unknown }>).reduce((sum, row) => {
    const metadata = parseTenantKnowledgeMetadata(row.metadata);
    return sum + metadata.parsed_size_bytes;
  }, 0);
}

export function buildTenantKnowledgeContext(
  tenantId: string,
  customerId: string,
  legacyInstanceId: string | null
): TenantKnowledgeMutationContext {
  return {
    tenantId,
    customerId,
    legacyInstanceId,
  };
}

export async function listTenantKnowledgeFiles(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext
): Promise<TenantKnowledgeFileMeta[]> {
  await ensureTenantKnowledgeHydratedFromLegacy(admin, context);

  const { data, error } = await admin
    .from("tenant_knowledge_items")
    .select(TENANT_KNOWLEDGE_SELECT)
    .eq("tenant_id", context.tenantId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(error, "Failed to list tenant knowledge files")
    );
  }

  return ((data || []) as TenantKnowledgeRow[]).map(mapTenantKnowledgeRow);
}

export async function createTenantKnowledgeFile(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext,
  file: File,
  requestedAgentId: string | null
): Promise<TenantKnowledgeFileMeta> {
  await ensureTenantKnowledgeHydratedFromLegacy(admin, context);

  const fileType = MIME_TO_FILE_TYPE_SAFE[file.type] as KnowledgeFileType | undefined;
  if (!fileType) {
    throw new TenantKnowledgeServiceError(
      400,
      "Unsupported file type. Allowed: PDF, DOCX, Markdown, plain text."
    );
  }

  if (file.size > MAX_RAW_FILE_SIZE) {
    throw new TenantKnowledgeServiceError(400, "File exceeds 10 MB size limit.");
  }

  const activeCount = await countActiveKnowledgeFiles(admin, context.tenantId);
  if (activeCount >= MAX_FILES_PER_INSTANCE) {
    throw new TenantKnowledgeServiceError(
      400,
      `Maximum ${MAX_FILES_PER_INSTANCE} files per instance.`
    );
  }

  const assignment = await resolveAgentAssignment(
    admin,
    context,
    requestedAgentId
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_RAW_FILE_SIZE) {
    throw new TenantKnowledgeServiceError(400, "File exceeds 10 MB size limit.");
  }

  if (!validateFileTypeMatchesMagicBytes(buffer, fileType)) {
    throw new TenantKnowledgeServiceError(
      400,
      "File content does not match its declared type."
    );
  }

  let parsedMarkdown: string;
  try {
    parsedMarkdown = await parseFile(buffer, fileType, file.name);
  } catch (error) {
    throw new TenantKnowledgeServiceError(
      400,
      `Failed to parse file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  const parsedSizeBytes = Buffer.byteLength(parsedMarkdown, "utf-8");
  const currentTotalParsedSize = await resolveTotalParsedSize(admin, context.tenantId);
  if (currentTotalParsedSize + parsedSizeBytes > MAX_TOTAL_PARSED_SIZE) {
    throw new TenantKnowledgeServiceError(
      400,
      "Total knowledge content would exceed 2 MB limit."
    );
  }

  const knowledgeId = crypto.randomUUID();
  const pathNamespace = context.legacyInstanceId || context.tenantId;
  const storagePath = `${context.customerId}/${pathNamespace}/${knowledgeId}-${file.name}`;
  const storageBucket = "knowledge-raw";

  const { error: storageError } = await admin.storage
    .from(storageBucket)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    throw new TenantKnowledgeServiceError(500, "Failed to store file backup.");
  }

  const metadata = buildTenantKnowledgeMetadata({
    agentId: assignment.metadataAgentId,
    fileType,
    fileSizeBytes: file.size,
    parsedSizeBytes,
    errorMessage: null,
  });

  const { data: insertedTenant, error: insertError } = await admin
    .from("tenant_knowledge_items")
    .insert({
      tenant_id: context.tenantId,
      customer_id: context.customerId,
      title: file.name,
      source_type: "file",
      mime_type: file.type,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      status: "active",
      metadata,
    })
    .select(TENANT_KNOWLEDGE_SELECT)
    .single();

  if (insertError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(insertError, "Failed to create tenant knowledge file")
    );
  }

  let tenantRow = insertedTenant as TenantKnowledgeRow;

  if (
    context.legacyInstanceId &&
    assignment.legacyAgentId !== assignment.metadataAgentId
  ) {
    const patchedMetadata = buildTenantKnowledgeMetadata({
      agentId: assignment.legacyAgentId,
      fileType,
      fileSizeBytes: file.size,
      parsedSizeBytes,
      errorMessage: null,
    });

    const { data: patchedTenantRow, error: patchError } = await admin
      .from("tenant_knowledge_items")
      .update({ metadata: patchedMetadata })
      .eq("id", tenantRow.id)
      .select(TENANT_KNOWLEDGE_SELECT)
      .single();

    if (patchError) {
      throw new TenantKnowledgeServiceError(
        500,
        safeErrorMessage(
          patchError,
          "Failed to update tenant knowledge assignment metadata"
        )
      );
    }

    tenantRow = patchedTenantRow as TenantKnowledgeRow;
  }

  try {
    tenantRow = await syncTenantKnowledgeToLegacy(
      admin,
      context,
      tenantRow,
      parsedMarkdown
    );
  } catch (error) {
    await admin.from("tenant_knowledge_items").delete().eq("id", tenantRow.id);
    throw error;
  }

  // Trigger background indexing (chunking + embeddings) for semantic search
  const metadataForAgent = parseTenantKnowledgeMetadata(tenantRow.metadata);
  try {
    tasks
      .trigger<typeof indexKnowledgeDocumentTask>("index-knowledge-document", {
        knowledgeItemId: tenantRow.id,
        tenantId: context.tenantId,
        customerId: context.customerId,
        agentId: metadataForAgent.agent_id,
        content: parsedMarkdown,
      })
      .catch(() => {
        // Trigger.dev unavailable — keyword search still works via content_tsv
      });
  } catch {
    // SDK import or config issue — non-blocking
  }

  return mapTenantKnowledgeRow(tenantRow);
}

export async function updateTenantKnowledgeFileAssignment(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext,
  fileIdentifier: string,
  requestedAgentId: string | null
): Promise<TenantKnowledgeFileMeta> {
  await ensureTenantKnowledgeHydratedFromLegacy(admin, context);

  const existing = await fetchTenantKnowledgeByIdentifier(
    admin,
    context.tenantId,
    fileIdentifier
  );

  if (!existing || existing.status === "archived") {
    throw new TenantKnowledgeServiceError(404, "File not found");
  }

  const assignment = await resolveAgentAssignment(
    admin,
    context,
    requestedAgentId
  );
  const currentMetadata = parseTenantKnowledgeMetadata(existing.metadata);
  const nextMetadata = buildTenantKnowledgeMetadata({
    agentId: assignment.metadataAgentId,
    fileType: currentMetadata.file_type,
    fileSizeBytes: currentMetadata.file_size_bytes,
    parsedSizeBytes: currentMetadata.parsed_size_bytes,
    errorMessage: currentMetadata.error_message,
  });

  const { data: updatedTenant, error: updateError } = await admin
    .from("tenant_knowledge_items")
    .update({ metadata: nextMetadata })
    .eq("id", existing.id)
    .select(TENANT_KNOWLEDGE_SELECT)
    .single();

  if (updateError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(updateError, "Failed to update tenant knowledge file")
    );
  }

  // Update agent_id on existing knowledge chunks to match the new assignment
  try {
    await admin
      .from("tenant_knowledge_chunks")
      .update({ agent_id: assignment.metadataAgentId })
      .eq("knowledge_item_id", existing.id);
  } catch {
    // Chunk reassignment is non-critical
  }

  if (context.legacyInstanceId && existing.legacy_knowledge_file_id) {
    const { error: legacyError } = await admin
      .from("knowledge_files")
      .update({ agent_id: assignment.legacyAgentId })
      .eq("id", existing.legacy_knowledge_file_id)
      .eq("instance_id", context.legacyInstanceId)
      .eq("status", "active");

    if (legacyError) {
      throw new TenantKnowledgeServiceError(
        500,
        safeErrorMessage(
          legacyError,
          "Failed to sync tenant knowledge agent assignment to legacy"
        )
      );
    }
  }

  return mapTenantKnowledgeRow(updatedTenant as TenantKnowledgeRow);
}

export async function archiveTenantKnowledgeFile(
  admin: SupabaseClient,
  context: TenantKnowledgeMutationContext,
  fileIdentifier: string
): Promise<void> {
  await ensureTenantKnowledgeHydratedFromLegacy(admin, context);

  const existing = await fetchTenantKnowledgeByIdentifier(
    admin,
    context.tenantId,
    fileIdentifier
  );

  if (!existing) {
    throw new TenantKnowledgeServiceError(404, "File not found");
  }

  const { error: archiveError } = await admin
    .from("tenant_knowledge_items")
    .update({ status: "archived" })
    .eq("id", existing.id);

  if (archiveError) {
    throw new TenantKnowledgeServiceError(
      500,
      safeErrorMessage(archiveError, "Failed to archive tenant knowledge file")
    );
  }

  // Remove knowledge chunks (embeddings + text) for the archived file
  try {
    await removeKnowledgeIndex(admin, existing.id);
  } catch {
    // Chunk cleanup is non-critical — stale chunks won't match after archive
  }

  if (context.legacyInstanceId && existing.legacy_knowledge_file_id) {
    const { error: legacyArchiveError } = await admin
      .from("knowledge_files")
      .update({ status: "archived" })
      .eq("id", existing.legacy_knowledge_file_id)
      .eq("instance_id", context.legacyInstanceId);

    if (legacyArchiveError) {
      throw new TenantKnowledgeServiceError(
        500,
        safeErrorMessage(
          legacyArchiveError,
          "Failed to sync tenant knowledge archive to legacy"
        )
      );
    }
  }
}
