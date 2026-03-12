import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChannelAgentMap } from "@/components/dashboard/channel-agent-map";
import { AssistantsList } from "@/components/dashboard/assistants-list";
import type { Agent } from "@/types/agent";
import type { SkillConfig } from "@/types/database";
import type { CustomSkill } from "@/types/custom-skill";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireDashboardCustomer,
  getCustomerInstance,
  getCustomerTenant,
} from "@/lib/auth/dashboard-session";
import { DiscordSetupBanner } from "@/components/dashboard/discord-setup-banner";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Discord" };

export default async function ChannelsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<ChannelsSkeleton />}>
      <ChannelsContent customerId={customerId} />
    </Suspense>
  );
}

async function ChannelsContent({ customerId }: { customerId: string }) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const [instance, tenant, { data: skillConfigs }, { data: customSkills }, { data: emailIdentity }, { data: composioRow }] = await Promise.all([
    getCustomerInstance(customerId),
    getCustomerTenant(customerId),
    supabase
      .from("skill_configs")
      .select("*")
      .eq("customer_id", customerId),
    supabase
      .from("custom_skills")
      .select("*")
      .eq("customer_id", customerId),
    supabase
      .from("email_identities")
      .select("address")
      .eq("customer_id", customerId)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("composio_configs")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!tenant) redirect("/onboarding");

  const composioConfig: ComposioConfig | null = composioRow
    ? {
        ...composioRow,
        connected_apps: (composioRow.connected_apps || []) as ComposioConnectedApp[],
      }
    : null;

  // Fetch tenant agents + legacy agents in parallel to avoid waterfall on fallback path
  const legacyAgentsPromise = instance
    ? supabase
        .from("agents")
        .select("*")
        .eq("instance_id", instance.id)
        .order("sort_order", { ascending: true })
    : Promise.resolve({ data: null });

  const [{ data: tenantAgents }, { data: legacyAgents }] = await Promise.all([
    supabase
      .from("tenant_agents")
      .select("id, customer_id, legacy_agent_id, agent_key, display_name, is_default, skills, sort_order, created_at, updated_at, config")
      .eq("tenant_id", tenant.id)
      .neq("status", "archived")
      .order("sort_order", { ascending: true }),
    legacyAgentsPromise,
  ]);

  const tenantBackedAgents: Agent[] = Array.isArray(tenantAgents)
    ? tenantAgents.map((row) => {
        const config =
          row.config && typeof row.config === "object" && !Array.isArray(row.config)
            ? (row.config as Record<string, unknown>)
            : {};
        const discordChannelId =
          typeof config.discord_channel_id === "string"
            ? config.discord_channel_id
            : null;
        const discordChannelName =
          typeof config.discord_channel_name === "string"
            ? config.discord_channel_name
            : null;
        const composioToolkits = Array.isArray(config.composio_toolkits)
          ? (config.composio_toolkits as string[])
          : [];
        const goal = typeof config.goal === "string" ? config.goal : null;
        const backstory = typeof config.backstory === "string" ? config.backstory : null;
        const toolApprovalOverrides =
          config.tool_approval_overrides && typeof config.tool_approval_overrides === "object" && !Array.isArray(config.tool_approval_overrides)
            ? (config.tool_approval_overrides as Record<string, import("@/types/agent").ToolApprovalLevel>)
            : {};

        const role = typeof config.role === "string" ? config.role : row.display_name;
        const autonomyLevel = typeof config.autonomy_level === "string"
          ? (config.autonomy_level as import("@/types/agent").AutonomyLevel)
          : "copilot";

        return {
          id: row.legacy_agent_id || row.id,
          instance_id: instance?.id || tenant.id,
          customer_id: row.customer_id,
          agent_key: row.agent_key,
          display_name: row.display_name,
          role,
          autonomy_level: autonomyLevel,
          discord_channel_id: discordChannelId,
          discord_channel_name: discordChannelName,
          is_default: row.is_default,
          skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
          composio_toolkits: composioToolkits,
          goal,
          backstory,
          can_delegate: config.can_delegate === true,
          can_receive_delegation: config.can_receive_delegation === true,
          tool_approval_overrides: toolApprovalOverrides,
          sort_order: row.sort_order,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } satisfies Agent;
      })
    : [];

  let typedAgents = tenantBackedAgents;
  if (typedAgents.length === 0 && legacyAgents) {
    typedAgents = legacyAgents as Agent[];
  }

  const typedSkillConfigs = (skillConfigs || []) as SkillConfig[];
  const typedCustomSkills = (customSkills || [])
    .filter((skill) => skill.status === "active") as CustomSkill[];
  const emailStatus = emailIdentity?.address || "Not enabled";
  const hasLinkedChannels = typedAgents.some((a) => !!a.discord_channel_id);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="font-headline text-2xl font-semibold">
          Discord & Agents
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Assign specialized AI agents to your Discord channels. Each agent
          can have its own role, skills, and scheduled work.
        </p>
      </div>

      <DiscordSetupBanner hasLinkedChannels={hasLinkedChannels} />

      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-headline text-base font-semibold text-text-primary">
              Optional Email Ingestion
            </h3>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              This is not required for setup. Enable it later only if you want
              to send files into Pantheon by email.
            </p>
            <p className="text-xs text-text-secondary mt-2">
              Status: <span className="font-mono">{emailStatus}</span>
            </p>
          </div>

          <Link
            href="/settings/email"
            className="inline-flex items-center justify-center border border-border hover:bg-muted text-foreground rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {emailIdentity ? "Manage Email" : "Enable Email"}
          </Link>
        </div>
      </div>

      {/* Channel → Agent Map */}
      {typedAgents.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5">
          <ChannelAgentMap agents={typedAgents} />
        </div>
      )}

      {/* Agents List */}
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5">
        <AssistantsList
          initialAgents={typedAgents}
          tenantId={tenant.id}
          globalSkillConfigs={typedSkillConfigs}
          customSkills={typedCustomSkills}
          composioConfig={composioConfig}
        />
      </div>
    </div>
  );
}

function ChannelsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-56 mb-1" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
