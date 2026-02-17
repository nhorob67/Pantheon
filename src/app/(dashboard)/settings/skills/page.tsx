import { createClient } from "@/lib/supabase/server";
import { SkillToggleCard } from "@/components/settings/skill-toggle-card";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import Link from "next/link";
import { Anvil, Plus } from "lucide-react";

export default async function SkillsSettingsPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const [{ data: skillConfigs }, instance, { data: customSkills }] = await Promise.all([
    supabase
      .from("skill_configs")
      .select("*")
      .eq("customer_id", customerId),
    getCustomerInstance(customerId),
    supabase
      .from("custom_skills")
      .select("id, display_name, slug, status")
      .eq("customer_id", customerId)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
  ]);

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
                instanceId={instance?.id || ""}
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
