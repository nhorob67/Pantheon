import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTenantAgentContext,
  createTenantRuntimeAgent,
} from "@/lib/runtime/tenant-agents";

const createTenantSchema = z.object({
  team_profile: z.object({
    team_name: z.string().min(3).max(50),
    team_goal: z.string().min(10),
    timezone: z.string().min(1),
  }),
  first_agent: z.object({
    display_name: z.string().min(2).max(50),
    role: z.string().min(5),
    goal: z.string().min(10),
    backstory: z.string().max(2000).optional(),
    autonomy_level: z.enum(["assisted", "copilot", "autopilot"]),
  }),
  discord_guild_id: z.string().optional(),
});

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Look up customer
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json(
      { error: "Customer account not found" },
      { status: 404 }
    );
  }

  const customerId = customer.id;
  const { team_profile, first_agent, discord_guild_id } = parsed.data;

  // Upsert team profile
  const { error: profileError } = await admin.from("team_profiles").upsert(
    {
      customer_id: customerId,
      team_name: team_profile.team_name,
      team_goal: team_profile.team_goal,
      timezone: team_profile.timezone,
    },
    { onConflict: "customer_id" }
  );

  if (profileError) {
    return NextResponse.json(
      { error: "Failed to create team profile" },
      { status: 500 }
    );
  }

  // Create tenant
  const slug = generateSlug(team_profile.team_name);
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      customer_id: customerId,
      slug,
      name: team_profile.team_name,
      status: "active",
      primary_channel_type: "discord",
    })
    .select("id, slug")
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }

  // Look up instance + add tenant owner in parallel
  const [{ data: instance }] = await Promise.all([
    admin
      .from("instances")
      .select("id")
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle(),
    admin.from("tenant_members").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    }),
  ]);

  if (instance) {
    const linkPromise = admin.from("instance_tenant_mappings").insert({
      instance_id: instance.id,
      tenant_id: tenant.id,
      customer_id: customerId,
      mapping_source: "runtime",
      mapping_status: "active",
    });

    if (discord_guild_id) {
      const { data: currentInstance } = await admin
        .from("instances")
        .select("channel_config")
        .eq("id", instance.id)
        .maybeSingle();

      const currentConfig =
        currentInstance?.channel_config &&
        typeof currentInstance.channel_config === "object" &&
        !Array.isArray(currentInstance.channel_config)
          ? currentInstance.channel_config
          : {};

      await Promise.all([
        linkPromise,
        admin
          .from("instances")
          .update({
            channel_config: {
              ...currentConfig,
              guild_id: discord_guild_id,
              discord_guild_id,
            },
          })
          .eq("id", instance.id),
      ]);
    } else {
      await linkPromise;
    }
  }

  const context = buildTenantAgentContext(
    tenant.id,
    customerId,
    instance?.id ?? null
  );
  const createdAgent = await createTenantRuntimeAgent(admin, context, {
    display_name: first_agent.display_name,
    role: first_agent.role,
    goal: first_agent.goal,
    backstory: first_agent.backstory || "",
    autonomy_level: first_agent.autonomy_level,
    is_default: true,
    skills: [],
    composio_toolkits: [],
    can_delegate: false,
    can_receive_delegation: false,
    tool_approval_overrides: {},
  });

  return NextResponse.json({
    tenant_id: tenant.id,
    slug: tenant.slug,
    agent_id: createdAgent.id,
  });
}
