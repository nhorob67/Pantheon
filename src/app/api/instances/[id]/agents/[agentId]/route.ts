import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAgentSchema } from "@/lib/validators/agent";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params;
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
  const data = parsed.data;

  // Verify agent belongs to this instance
  const { data: existingAgent } = await admin
    .from("agents")
    .select("id, instance_id, agent_key, display_name, personality_preset, is_default, skills, cron_jobs, sort_order")
    .eq("id", agentId)
    .eq("instance_id", id)
    .single();

  if (!existingAgent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Handle default swap
  if (data.is_default === true && !existingAgent.is_default) {
    await admin.rpc("set_default_agent", {
      p_instance_id: id,
      p_agent_id: agentId,
    });
  }

  // Build update object, omitting undefined fields
  const update: Record<string, unknown> = {};
  if (data.display_name !== undefined) update.display_name = data.display_name;
  if (data.personality_preset !== undefined)
    update.personality_preset = data.personality_preset;
  if (data.custom_personality !== undefined)
    update.custom_personality = data.custom_personality;
  if (data.discord_channel_id !== undefined)
    update.discord_channel_id = data.discord_channel_id || null;
  if (data.discord_channel_name !== undefined)
    update.discord_channel_name = data.discord_channel_name || null;
  if (data.skills !== undefined) update.skills = data.skills;
  if (data.cron_jobs !== undefined) update.cron_jobs = data.cron_jobs;

  if (Object.keys(update).length > 0) {
    const { error } = await admin
      .from("agents")
      .update(update)
      .eq("id", agentId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update agent", details: safeErrorMessage(error, "Database error") },
        { status: 500 }
      );
    }
  }

  // Fetch updated agent
  const { data: agent } = await admin
    .from("agents")
    .select("id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at")
    .eq("id", agentId)
    .single();

  // Rebuild and deploy
  try {
    await rebuildAndDeploy(id);
  } catch {
    return NextResponse.json({
      agent,
      warning: "Agent updated but config deploy failed. Try restarting.",
    });
  }

  return NextResponse.json({ agent });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params;
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

  // Count agents for this instance
  const { count } = await admin
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("instance_id", id);

  if (count !== null && count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last agent" },
      { status: 400 }
    );
  }

  // Check if deleting the default agent
  const { data: agent } = await admin
    .from("agents")
    .select("id, instance_id, is_default")
    .eq("id", agentId)
    .eq("instance_id", id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Delete the agent
  await admin.from("agents").delete().eq("id", agentId);

  // If we deleted the default, promote the next agent
  if (agent.is_default) {
    const { data: nextAgent } = await admin
      .from("agents")
      .select("id")
      .eq("instance_id", id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    if (nextAgent) {
      await admin
        .from("agents")
        .update({ is_default: true })
        .eq("id", nextAgent.id);
    }
  }

  // Rebuild and deploy
  try {
    await rebuildAndDeploy(id);
  } catch {
    return NextResponse.json({
      success: true,
      warning: "Agent deleted but config deploy failed. Try restarting.",
    });
  }

  return NextResponse.json({ success: true });
}
