import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { knowledgeUpdateSchema } from "@/lib/validators/knowledge";
import { KNOWLEDGE_META_COLUMNS } from "@/types/knowledge";
import { resolveRequestTraceIdFromHeaders } from "@/lib/runtime/request-trace";
import {
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "@/lib/runtime/instance-bridge";
import { resolveTenantRuntimeGateState } from "@/lib/runtime/tenant-runtime-gates";
import {
  resolveTenantIdForInstance,
  TenantAgentServiceError,
} from "@/lib/runtime/tenant-agents";
import {
  archiveTenantKnowledgeFile,
  buildTenantKnowledgeContext,
  TenantKnowledgeServiceError,
  toLegacyKnowledgeFileMeta,
  updateTenantKnowledgeFileAssignment,
} from "@/lib/runtime/tenant-knowledge";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
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

  const body = await request.json();
  const parsed = knowledgeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
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
      const tenantFile = await updateTenantKnowledgeFileAssignment(
        admin,
        context,
        fileId,
        parsed.data.agent_id ?? null
      );

      const response = NextResponse.json({
        file: toLegacyKnowledgeFileMeta(tenantFile, id),
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
        { error: "Failed to update bridged tenant knowledge file" },
        { status: 500 }
      );
    }
  }

  if (parsed.data.agent_id) {
    const { data: agent } = await admin
      .from("agents")
      .select("id")
      .eq("id", parsed.data.agent_id)
      .eq("instance_id", id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 400 });
    }
  }

  const { data: file, error } = await admin
    .from("knowledge_files")
    .update({ agent_id: parsed.data.agent_id })
    .eq("id", fileId)
    .eq("instance_id", id)
    .eq("status", "active")
    .select(KNOWLEDGE_META_COLUMNS)
    .single();

  if (error || !file) {
    return NextResponse.json(
      { error: error?.message || "File not found" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ file });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
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
      await archiveTenantKnowledgeFile(admin, context, fileId);

      const response = NextResponse.json({ success: true });
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
        { error: "Failed to archive bridged tenant knowledge file" },
        { status: 500 }
      );
    }
  }

  const { error } = await admin
    .from("knowledge_files")
    .update({ status: "archived" })
    .eq("id", fileId)
    .eq("instance_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
