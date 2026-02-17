import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChannelAgentMap } from "@/components/dashboard/channel-agent-map";
import { AssistantsList } from "@/components/dashboard/assistants-list";
import type { Agent } from "@/types/agent";
import type { SkillConfig } from "@/types/database";
import type { CustomSkill } from "@/types/custom-skill";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";

export default async function ChannelsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const instance = await getCustomerInstance(customerId);

  if (!instance) redirect("/onboarding");

  // Fetch agents, skill configs, custom skills, and email identity in parallel
  const [{ data: agents }, { data: skillConfigs }, { data: customSkills }, { data: emailIdentity }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .eq("instance_id", instance.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("skill_configs")
      .select("*")
      .eq("customer_id", customerId),
    supabase
      .from("custom_skills")
      .select("*")
      .eq("customer_id", customerId)
      .eq("status", "active"),
    supabase
      .from("email_identities")
      .select("address")
      .eq("customer_id", customerId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const typedAgents = (agents || []) as Agent[];
  const typedSkillConfigs = (skillConfigs || []) as SkillConfig[];
  const typedCustomSkills = (customSkills || []) as CustomSkill[];
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
          instanceId={instance.id}
          globalSkillConfigs={typedSkillConfigs}
          customSkills={typedCustomSkills}
        />
      </div>
    </div>
  );
}
