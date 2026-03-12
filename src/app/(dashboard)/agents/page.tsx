import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AssistantsList } from "@/components/dashboard/assistants-list";
import { toAutonomyLevel, type Agent } from "@/types/agent";
import type { SkillConfig } from "@/types/database";
import type { CustomSkill } from "@/types/custom-skill";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";
import type { Metadata } from "next";
import {
  requireDashboardCustomer,
  getCustomerTenant,
} from "@/lib/auth/dashboard-session";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();
  const admin = createAdminClient();

  const tenant = await getCustomerTenant(customerId);
  if (!tenant) {
    redirect("/onboarding");
  }

  const [
    { data: tenantAgents },
    { data: skillConfigs },
    { data: customSkills },
    { data: composioRow },
  ] = await Promise.all([
    supabase
      .from("tenant_agents")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("skill_configs")
      .select("*")
      .eq("customer_id", customerId),
    supabase
      .from("custom_skills")
      .select("id, slug, display_name, description, status")
      .eq("customer_id", customerId)
      .eq("status", "active"),
    admin
      .from("composio_configs")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  const agents: Agent[] = (tenantAgents || []).map((a) => {
    const config =
      a.config && typeof a.config === "object" && !Array.isArray(a.config)
        ? (a.config as Record<string, unknown>)
        : {};

    return {
      id: a.legacy_agent_id || a.id,
      instance_id: tenant.id,
      customer_id: a.customer_id,
      agent_key: a.agent_key,
      display_name: a.display_name,
      role: typeof config.role === "string" ? config.role : a.display_name,
      goal: typeof config.goal === "string" ? config.goal : null,
      backstory: typeof config.backstory === "string" ? config.backstory : null,
      autonomy_level: toAutonomyLevel(config.autonomy_level),
      discord_channel_id:
        typeof config.discord_channel_id === "string"
          ? config.discord_channel_id
          : null,
      discord_channel_name:
        typeof config.discord_channel_name === "string"
          ? config.discord_channel_name
          : null,
      is_default: a.is_default,
      skills: Array.isArray(a.skills) ? a.skills : [],
      composio_toolkits: Array.isArray(config.composio_toolkits)
        ? (config.composio_toolkits as string[])
        : [],
      can_delegate: config.can_delegate === true,
      can_receive_delegation: config.can_receive_delegation === true,
      tool_approval_overrides:
        config.tool_approval_overrides &&
        typeof config.tool_approval_overrides === "object" &&
        !Array.isArray(config.tool_approval_overrides)
          ? (config.tool_approval_overrides as Record<string, "auto" | "confirm" | "disabled">)
          : {},
      sort_order: a.sort_order,
      created_at: a.created_at,
      updated_at: a.updated_at,
    };
  });

  const typedSkillConfigs = (skillConfigs || []) as SkillConfig[];
  const typedCustomSkills = (customSkills || []) as CustomSkill[];

  const composioConfig: ComposioConfig | null = composioRow
    ? {
        ...composioRow,
        connected_apps: (composioRow.connected_apps || []) as ComposioConnectedApp[],
      }
    : null;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          Agents
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Your AI team members. Each agent can own a Discord channel.
        </p>
      </div>

      <AssistantsList
        initialAgents={agents}
        tenantId={tenant.id}
        globalSkillConfigs={typedSkillConfigs}
        customSkills={typedCustomSkills}
        composioConfig={composioConfig}
      />
    </div>
  );
}
