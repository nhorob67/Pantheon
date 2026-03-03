import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChannelAgentMap } from "@/components/dashboard/channel-agent-map";
import { AssistantsList } from "@/components/dashboard/assistants-list";

export const metadata: Metadata = { title: "Assistants" };
import type { Agent } from "@/types/agent";
import type { PersonalityPreset } from "@/types/agent";
import type { SkillConfig } from "@/types/database";
import type { CustomSkill } from "@/types/custom-skill";
import {
  requireDashboardCustomer,
  getCustomerInstance,
  getCustomerTenant,
} from "@/lib/auth/dashboard-session";

export default async function ChannelsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const [instance, tenant] = await Promise.all([
    getCustomerInstance(customerId),
    getCustomerTenant(customerId),
  ]);

  if (!tenant) redirect("/onboarding");

  // Fetch tenant-first agents, then fall back to legacy agents only if tenant rows are absent.
  const [{ data: tenantAgents }, { data: skillConfigs }, { data: customSkills }, { data: emailIdentity }] = await Promise.all([
    supabase
      .from("tenant_agents")
      .select("id, customer_id, legacy_agent_id, agent_key, display_name, is_default, skills, sort_order, created_at, updated_at, config")
      .eq("tenant_id", tenant.id)
      .neq("status", "archived")
      .order("sort_order", { ascending: true }),
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
  ]);

  const tenantBackedAgents: Agent[] = Array.isArray(tenantAgents)
    ? tenantAgents.map((row) => {
        const config =
          row.config && typeof row.config === "object" && !Array.isArray(row.config)
            ? (row.config as Record<string, unknown>)
            : {};
        const personalityPreset =
          typeof config.personality_preset === "string"
            ? (config.personality_preset as PersonalityPreset)
            : "general";
        const customPersonality =
          typeof config.custom_personality === "string"
            ? config.custom_personality
            : null;
        const discordChannelId =
          typeof config.discord_channel_id === "string"
            ? config.discord_channel_id
            : null;
        const discordChannelName =
          typeof config.discord_channel_name === "string"
            ? config.discord_channel_name
            : null;
        const cronJobs =
          config.cron_jobs && typeof config.cron_jobs === "object" && !Array.isArray(config.cron_jobs)
            ? (config.cron_jobs as Record<string, boolean>)
            : {};

        return {
          id: row.legacy_agent_id || row.id,
          instance_id: instance?.id || tenant.id,
          customer_id: row.customer_id,
          agent_key: row.agent_key,
          display_name: row.display_name,
          personality_preset: personalityPreset,
          custom_personality: customPersonality,
          discord_channel_id: discordChannelId,
          discord_channel_name: discordChannelName,
          is_default: row.is_default,
          skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
          cron_jobs: cronJobs,
          sort_order: row.sort_order,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } satisfies Agent;
      })
    : [];

  let typedAgents = tenantBackedAgents;
  if (typedAgents.length === 0 && instance) {
    const { data: legacyAgents } = await supabase
      .from("agents")
      .select("*")
      .eq("instance_id", instance.id)
      .order("sort_order", { ascending: true });
    typedAgents = (legacyAgents || []) as Agent[];
  }

  const typedSkillConfigs = (skillConfigs || []) as SkillConfig[];
  const typedCustomSkills = (customSkills || [])
    .filter((skill) => skill.status === "active") as CustomSkill[];
  const emailStatus = emailIdentity?.address || "Not enabled";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="font-headline text-xl font-bold text-text-primary">
          Channels & Assistants
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Assign specialized AI assistants to your Discord channels. Each assistant
          can have its own personality, skills, and scheduled messages.
        </p>
      </div>

      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-headline text-base font-semibold text-text-primary">
              Optional Email Ingestion
            </h3>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              This is not required for setup. Enable it later only if you want
              to send files into FarmClaw by email.
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

      {/* Assistants List */}
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5">
        <AssistantsList
          initialAgents={typedAgents}
          tenantId={tenant.id}
          globalSkillConfigs={typedSkillConfigs}
          customSkills={typedCustomSkills}
        />
      </div>
    </div>
  );
}
