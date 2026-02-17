import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentSchema } from "@/lib/validators/agent";
import { rebuildAndDeploy } from "@/lib/templates/rebuild-config";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { consumeAgentManagementRateLimit } from "@/lib/security/user-rate-limit";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: agents } = await supabase
    .from("agents")
    .select("id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at")
    .eq("instance_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ agents: agents || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const data = parsed.data;

  // Generate agent_key from display_name
  let agentKey = slugify(data.display_name);

  // Ensure unique key for this instance
  const { data: existing } = await admin
    .from("agents")
    .select("agent_key")
    .eq("instance_id", id)
    .like("agent_key", `${agentKey}%`);

  if (existing && existing.length > 0) {
    const existingKeys = new Set(existing.map((a) => a.agent_key));
    if (existingKeys.has(agentKey)) {
      let suffix = 2;
      while (existingKeys.has(`${agentKey}-${suffix}`)) suffix++;
      agentKey = `${agentKey}-${suffix}`;
    }
  }

  const isFirstAgent = !existing || existing.length === 0;
  const shouldBeDefault = data.is_default || isFirstAgent;

  // Get next sort_order
  const { data: lastAgent } = await admin
    .from("agents")
    .select("sort_order")
    .eq("instance_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = lastAgent ? lastAgent.sort_order + 1 : 0;

  // Handle default swap
  if (shouldBeDefault) {
    await admin.rpc("set_default_agent", {
      p_instance_id: id,
      p_agent_id: "00000000-0000-0000-0000-000000000000", // clear existing default
    });
  }

  const { data: agent, error } = await admin
    .from("agents")
    .insert({
      instance_id: id,
      customer_id: instance.customer_id,
      agent_key: agentKey,
      display_name: data.display_name,
      personality_preset: data.personality_preset,
      custom_personality:
        data.personality_preset === "custom"
          ? data.custom_personality
          : null,
      discord_channel_id: data.discord_channel_id || null,
      discord_channel_name: data.discord_channel_name || null,
      is_default: shouldBeDefault,
      skills: data.skills,
      cron_jobs: data.cron_jobs,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create agent", details: safeErrorMessage(error, "Database error") },
      { status: 500 }
    );
  }

  // Rebuild and deploy
  try {
    await rebuildAndDeploy(id);
  } catch {
    // Agent was created but deploy failed — return agent with warning
    return NextResponse.json({
      agent,
      warning: "Agent created but config deploy failed. Try restarting.",
    });
  }

  return NextResponse.json({ agent }, { status: 201 });
}
