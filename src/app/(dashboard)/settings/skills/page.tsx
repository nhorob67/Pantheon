import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SkillToggleCard } from "@/components/settings/skill-toggle-card";
import { requireDashboardCustomer, getCustomerTenant } from "@/lib/auth/dashboard-session";
import Link from "next/link";
import { Anvil, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <Suspense fallback={<SkillsSkeleton />}>
      <SkillsContent customerId={customerId} />
    </Suspense>
  );
}

async function SkillsContent({ customerId }: { customerId: string }) {
  const [tenant, supabase] = await Promise.all([
    getCustomerTenant(customerId),
    createClient(),
  ]);

  if (!tenant) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">
            Built-in Skills
          </h3>
          <p className="text-foreground/60 text-sm">
            Tenant workspace setup is required before managing skills.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: skillConfigs }, { data: customSkills }, { data: tenantAgents }] = await Promise.all([
    supabase
      .from("skill_configs")
      .select("*")
      .eq("customer_id", customerId),
    supabase
      .from("custom_skills")
      .select("id, display_name, slug, status")
      .eq("customer_id", customerId)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_agents")
      .select("display_name, skills")
      .eq("tenant_id", tenant.id)
      .neq("status", "archived"),
  ]);

  const agents = (tenantAgents || []) as Array<{ display_name: string; skills: string[] }>;

  function agentsUsingSkill(slug: string): string[] {
    return agents
      .filter((a) => Array.isArray(a.skills) && a.skills.includes(slug))
      .map((a) => a.display_name);
  }

  const skills = ["farm-grain-bids", "farm-weather", "farm-scale-tickets"];
  const activeCustomSkills = (customSkills || []).filter((s) => s.status === "active");

  return (
    <div>
      {/* Built-in skills */}
      <div className="mb-8">
        <h3 className="font-headline text-lg font-semibold mb-1">Built-in Skills</h3>
        <p className="text-foreground/60 text-sm mb-4">
          Toggle skills on or off for your assistant.
        </p>
        <div className="space-y-3">
          {skills.map((skillName) => {
            const config = (skillConfigs || []).find(
              (s) => s.skill_name === skillName
            );
            return (
              <SkillToggleCard
                key={skillName}
                skillName={skillName}
                enabled={config?.enabled ?? true}
                tenantId={tenant.id}
                agentNames={agentsUsingSkill(skillName)}
              />
            );
          })}
        </div>
      </div>

      {/* Custom skills section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline text-lg font-semibold mb-1">Custom Skills</h3>
            <p className="text-foreground/60 text-sm">
              Skills you&apos;ve created with the Skill Forge.
            </p>
          </div>
          <Link
            href="/settings/skills/forge"
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2"
          >
            <Anvil className="w-4 h-4" />
            Skill Forge
          </Link>
        </div>

        {activeCustomSkills.length > 0 ? (
          <div className="space-y-3">
            {activeCustomSkills.map((cs) => (
              <div
                key={cs.id}
                className="flex items-center justify-between bg-card rounded-xl border border-border shadow-sm p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center">
                    <Anvil className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cs.display_name}</p>
                    <p className="text-xs text-foreground/50 font-mono">{cs.slug}</p>
                    {(() => {
                      const names = agentsUsingSkill(cs.slug);
                      return names.length > 0 ? (
                        <p className="text-xs text-accent mt-0.5">
                          Used by {names.length} assistant{names.length !== 1 ? "s" : ""}: {names.join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-foreground/30 mt-0.5">Not assigned to any assistant</p>
                      );
                    })()}
                  </div>
                </div>
                <Link
                  href={`/settings/skills/forge/${cs.id}`}
                  className="text-xs text-accent hover:text-accent-light transition-colors"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 rounded-xl border border-dashed border-border">
            <p className="text-sm text-foreground/50 mb-3">
              No custom skills yet
            </p>
            <Link
              href="/settings/skills/forge/new"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first custom skill
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-64 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
