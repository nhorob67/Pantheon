import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { parseFile } from "@/lib/knowledge/parser";
import { validateFileTypeMatchesMagicBytes } from "@/lib/knowledge/detect-file-type";
import {
  MIME_TO_FILE_TYPE,
  MAX_RAW_FILE_SIZE,
  MAX_FILES_PER_INSTANCE,
  MAX_TOTAL_PARSED_SIZE,
  KNOWLEDGE_META_COLUMNS,
} from "@/types/knowledge";
import type { KnowledgeFileType } from "@/types/knowledge";
import { resolveRequestTraceIdFromHeaders } from "@/lib/runtime/request-trace";
import {
  shouldBridgeInstanceRead,
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "@/lib/runtime/instance-bridge";
import { resolveTenantRuntimeGateState } from "@/lib/runtime/tenant-runtime-gates";
import {
  resolveTenantIdForInstance,
  TenantAgentServiceError,
} from "@/lib/runtime/tenant-agents";
import {
  buildTenantKnowledgeContext,
  createTenantKnowledgeFile,
  listTenantKnowledgeFiles,
  TenantKnowledgeServiceError,
  toLegacyKnowledgeFileMeta,
} from "@/lib/runtime/tenant-knowledge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const runtimeGates = await resolveTenantRuntimeGateState(
    admin,
    instance.customer_id
  );

  const tenantId = runtimeGates.reads_enabled
    ? await resolveTenantIdForInstance(admin, id)
    : null;
  if (shouldBridgeInstanceRead(runtimeGates, tenantId)) {
    try {
      const context = buildTenantKnowledgeContext(
        tenantId,
        instance.customer_id,
        id
      );
      const tenantFiles = await listTenantKnowledgeFiles(admin, context);
      const response = NextResponse.json({
        files: tenantFiles.map((file) => toLegacyKnowledgeFileMeta(file, id)),
      });
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (
        error instanceof TenantKnowledgeServiceError ||
        error instanceof TenantAgentServiceError
      ) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: "Failed to list bridged tenant knowledge files" },
        { status: 500 }
      );
    }
  }

  const { data: files } = await admin
    .from("knowledge_files")
    .select(KNOWLEDGE_META_COLUMNS)
    .eq("instance_id", id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return NextResponse.json({ files: files || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeConfigUpdateRateLimit(user.id);
  if (rateLimit === "unavailable") {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (rateLimit === "blocked") {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");
  const file = fileValue instanceof File ? fileValue : null;
  const rawAgentId = formData.get("agent_id");
  const agentId =
    typeof rawAgentId === "string" && rawAgentId.trim().length > 0
      ? rawAgentId
      : null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const admin = createAdminClient();
  const runtimeGates = await resolveTenantRuntimeGateState(
    admin,
    instance.customer_id
  );

  const tenantId = runtimeGates.writes_enabled
    ? await resolveTenantIdForInstance(admin, id)
    : null;
  if (shouldBridgeInstanceWrite(runtimeGates, tenantId)) {
    try {
      const context = buildTenantKnowledgeContext(
        tenantId,
        instance.customer_id,
        id
      );
      const tenantFile = await createTenantKnowledgeFile(
        admin,
        context,
        file,
        agentId
      );

      const response = NextResponse.json(
        { file: toLegacyKnowledgeFileMeta(tenantFile, id) },
        { status: 201 }
      );
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (
        error instanceof TenantKnowledgeServiceError ||
        error instanceof TenantAgentServiceError
      ) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: "Failed to create bridged tenant knowledge file" },
        { status: 500 }
      );
    }
  }

  const fileType = MIME_TO_FILE_TYPE[file.type] as KnowledgeFileType | undefined;
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, DOCX, Markdown, plain text." },
      { status: 400 }
    );
  }

  if (file.size > MAX_RAW_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10 MB size limit." },
      { status: 400 }
    );
  }

  const { count } = await admin
    .from("knowledge_files")
    .select("id", { count: "exact", head: true })
    .eq("instance_id", id)
    .eq("status", "active");

  if ((count ?? 0) >= MAX_FILES_PER_INSTANCE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES_PER_INSTANCE} files per instance.` },
      { status: 400 }
    );
  }

  if (agentId) {
    const { data: agent } = await admin
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("instance_id", id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 400 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_RAW_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10 MB size limit." },
      { status: 400 }
    );
  }

  if (!validateFileTypeMatchesMagicBytes(buffer, fileType)) {
    return NextResponse.json(
      { error: "File content does not match its declared type." },
      { status: 400 }
    );
  }

  let parsedMarkdown: string;

  try {
    parsedMarkdown = await parseFile(buffer, fileType, file.name);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to parse file: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      },
      { status: 400 }
    );
  }

  const parsedSizeBytes = Buffer.byteLength(parsedMarkdown, "utf-8");

  const { data: existingFiles } = await admin
    .from("knowledge_files")
    .select("parsed_size_bytes")
    .eq("instance_id", id)
    .eq("status", "active");

  const currentTotal = (existingFiles || []).reduce(
    (sum, knowledgeFile) => sum + knowledgeFile.parsed_size_bytes,
    0
  );

  if (currentTotal + parsedSizeBytes > MAX_TOTAL_PARSED_SIZE) {
    return NextResponse.json(
      { error: "Total knowledge content would exceed 2 MB limit." },
      { status: 400 }
    );
  }

  const fileId = crypto.randomUUID();
  const storagePath = `${instance.customer_id}/${id}/${fileId}-${file.name}`;

  const { error: storageError } = await admin.storage
    .from("knowledge-raw")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      { error: "Failed to store file backup." },
      { status: 500 }
    );
  }

  const { data: knowledgeFile, error: insertError } = await admin
    .from("knowledge_files")
    .insert({
      customer_id: instance.customer_id,
      instance_id: id,
      agent_id: agentId,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      storage_path: storagePath,
      parsed_markdown: parsedMarkdown,
      parsed_size_bytes: parsedSizeBytes,
      status: "active",
    })
    .select(KNOWLEDGE_META_COLUMNS)
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ file: knowledgeFile }, { status: 201 });
}
