import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAgentSchema, type UpdateAgentData } from "@/lib/validators/agent";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";
import { resolveRequestTraceIdFromHeaders } from "@/lib/runtime/request-trace";
import {
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "@/lib/runtime/instance-bridge";
import { resolveTenantRuntimeGateState } from "@/lib/runtime/tenant-runtime-gates";
import {
  buildTenantAgentContext,
  deleteTenantRuntimeAgent,
  resolveTenantIdForInstance,
  TenantAgentServiceError,
  toLegacyAgentResponse,
  updateTenantRuntimeAgent,
} from "@/lib/runtime/tenant-agents";

async function updateLegacyAgent(
  admin: ReturnType<typeof createAdminClient>,
  instanceId: string,
  agentId: string,
  data: UpdateAgentData
) {
  const { data: existingAgent } = await admin
    .from("agents")
    .select(
      "id, instance_id, agent_key, display_name, personality_preset, is_default, skills, cron_jobs, sort_order"
    )
    .eq("id", agentId)
    .eq("instance_id", instanceId)
    .single();

  if (!existingAgent) {
    throw new TenantAgentServiceError(404, "Agent not found");
  }

  if (data.is_default === true && !existingAgent.is_default) {
    await admin.rpc("set_default_agent", {
      p_instance_id: instanceId,
      p_agent_id: agentId,
    });
  }

  const update: Record<string, unknown> = {};
  if (data.display_name !== undefined) {
    update["display_name"] = data.display_name;
  }
  if (data.personality_preset !== undefined) {
    update["personality_preset"] = data.personality_preset;
  }
  if (data.custom_personality !== undefined) {
    update["custom_personality"] = data.custom_personality;
  }
  if (data.discord_channel_id !== undefined) {
    update["discord_channel_id"] = data.discord_channel_id || null;
  }
  if (data.discord_channel_name !== undefined) {
    update["discord_channel_name"] = data.discord_channel_name || null;
  }
  if (data.skills !== undefined) {
    update["skills"] = data.skills;
  }
  if (data.cron_jobs !== undefined) {
    update["cron_jobs"] = data.cron_jobs;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from("agents").update(update).eq("id", agentId);

    if (error) {
      throw new TenantAgentServiceError(
        500,
        "Failed to update agent",
        safeErrorMessage(error, "Database error")
      );
    }
  }

  const { data: agent, error: refreshError } = await admin
    .from("agents")
    .select(
      "id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at"
    )
    .eq("id", agentId)
    .single();

  if (refreshError) {
    throw new TenantAgentServiceError(
      500,
      "Failed to load updated agent",
      safeErrorMessage(refreshError, "Database error")
    );
  }

  return agent;
}

async function deleteLegacyAgent(
  admin: ReturnType<typeof createAdminClient>,
  instanceId: string,
  agentId: string
): Promise<void> {
  const { count } = await admin
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("instance_id", instanceId);

  if (count !== null && count <= 1) {
    throw new TenantAgentServiceError(400, "Cannot delete the last agent");
  }

  const { data: agent } = await admin
    .from("agents")
    .select("id, instance_id, is_default")
    .eq("id", agentId)
    .eq("instance_id", instanceId)
    .single();

  if (!agent) {
    throw new TenantAgentServiceError(404, "Agent not found");
  }

  const { error: deleteError } = await admin.from("agents").delete().eq("id", agentId);
  if (deleteError) {
    throw new TenantAgentServiceError(
      500,
      "Failed to delete agent",
      safeErrorMessage(deleteError, "Database error")
    );
  }

  if (agent.is_default) {
    const { data: nextAgent } = await admin
      .from("agents")
      .select("id")
      .eq("instance_id", instanceId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (nextAgent) {
      await admin.from("agents").update({ is_default: true }).eq("id", nextAgent.id);
    }
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params;
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeAgentManagementRateLimit(user.id);
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
  const parsed = updateAgentSchema.safeParse(body);

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
      const context = buildTenantAgentContext(
        tenantId,
        instance.customer_id,
        id
      );
      const tenantAgent = await updateTenantRuntimeAgent(
        admin,
        context,
        agentId,
        parsed.data
      );

      const response = NextResponse.json({
        agent: toLegacyAgentResponse(tenantAgent, id),
      });
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (error instanceof TenantAgentServiceError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to update bridged tenant agent") },
        { status: 500 }
      );
    }
  }

  try {
    const agent = await updateLegacyAgent(admin, id, agentId, parsed.data);

    return NextResponse.json({ agent });
  } catch (error) {
    if (error instanceof TenantAgentServiceError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to update agent") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params;
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeAgentManagementRateLimit(user.id);
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
      const context = buildTenantAgentContext(
        tenantId,
        instance.customer_id,
        id
      );
      await deleteTenantRuntimeAgent(admin, context, agentId);

      const response = NextResponse.json({ success: true });
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (error instanceof TenantAgentServiceError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to delete bridged tenant agent") },
        { status: 500 }
      );
    }
  }

  try {
    await deleteLegacyAgent(admin, id, agentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantAgentServiceError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to delete agent") },
      { status: 500 }
    );
  }
}
