import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentSchema, type CreateAgentData } from "@/lib/validators/agent";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";
import { resolveRequestTraceIdFromHeaders } from "@/lib/runtime/request-trace";
import {
  shouldBridgeInstanceRead,
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "@/lib/runtime/instance-bridge";
import { resolveTenantRuntimeGateState } from "@/lib/runtime/tenant-runtime-gates";
import {
  buildTenantAgentContext,
  createTenantRuntimeAgent,
  listTenantRuntimeAgents,
  resolveTenantIdForInstance,
  TenantAgentServiceError,
  toLegacyAgentResponse,
} from "@/lib/runtime/tenant-agents";

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return slug.length > 0 ? slug : "agent";
}

async function createLegacyAgent(
  admin: ReturnType<typeof createAdminClient>,
  instanceId: string,
  customerId: string,
  data: CreateAgentData
) {
  let agentKey = slugify(data.display_name);

  const { data: existing } = await admin
    .from("agents")
    .select("agent_key")
    .eq("instance_id", instanceId)
    .like("agent_key", `${agentKey}%`);

  if (existing && existing.length > 0) {
    const existingKeys = new Set(existing.map((agent) => agent.agent_key));
    if (existingKeys.has(agentKey)) {
      let suffix = 2;
      while (existingKeys.has(`${agentKey}-${suffix}`)) {
        suffix += 1;
      }
      agentKey = `${agentKey}-${suffix}`;
    }
  }

  const isFirstAgent = !existing || existing.length === 0;
  const shouldBeDefault = data.is_default || isFirstAgent;

  const { data: lastAgent } = await admin
    .from("agents")
    .select("sort_order")
    .eq("instance_id", instanceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = lastAgent ? lastAgent.sort_order + 1 : 0;

  if (shouldBeDefault) {
    await admin.rpc("set_default_agent", {
      p_instance_id: instanceId,
      p_agent_id: "00000000-0000-0000-0000-000000000000",
    });
  }

  const { data: agent, error } = await admin
    .from("agents")
    .insert({
      instance_id: instanceId,
      customer_id: customerId,
      agent_key: agentKey,
      display_name: data.display_name,
      personality_preset: data.personality_preset,
      custom_personality:
        data.personality_preset === "custom" ? data.custom_personality : null,
      discord_channel_id: data.discord_channel_id || null,
      discord_channel_name: data.discord_channel_name || null,
      is_default: shouldBeDefault,
      skills: data.skills,
      cron_jobs: data.cron_jobs,
      sort_order: sortOrder,
    })
    .select(
      "id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      "Failed to create agent",
      safeErrorMessage(error, "Database error")
    );
  }

  return agent;
}

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
      const context = buildTenantAgentContext(
        tenantId,
        instance.customer_id,
        id
      );
      const tenantAgents = await listTenantRuntimeAgents(admin, context);
      const response = NextResponse.json({
        agents: tenantAgents.map((agent) => toLegacyAgentResponse(agent, id)),
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
        { error: safeErrorMessage(error, "Failed to list bridged tenant agents") },
        { status: 500 }
      );
    }
  }

  const { data: agents } = await supabase
    .from("agents")
    .select(
      "id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at"
    )
    .eq("instance_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ agents: agents || [] });
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
  const parsed = createAgentSchema.safeParse(body);

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
      const tenantAgent = await createTenantRuntimeAgent(
        admin,
        context,
        parsed.data
      );

      const response = NextResponse.json(
        { agent: toLegacyAgentResponse(tenantAgent, id) },
        { status: 201 }
      );
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (error instanceof TenantAgentServiceError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to create bridged tenant agent") },
        { status: 500 }
      );
    }
  }

  try {
    const agent = await createLegacyAgent(
      admin,
      id,
      instance.customer_id,
      parsed.data
    );

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantAgentServiceError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create agent") },
      { status: 500 }
    );
  }
}
