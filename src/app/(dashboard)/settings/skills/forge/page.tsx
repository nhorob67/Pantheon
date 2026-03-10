import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { SkillForgeLibrary } from "./skill-forge-library";
import Link from "next/link";
import { Plus, Anvil } from "lucide-react";

export const metadata: Metadata = { title: "Skill Forge" };

export default async function ForgeLibraryPage() {
  const { customerId } = await requireDashboardCustomer();
  const supabase = await createClient();

  const { data: skills } = await supabase
    .from("custom_skills")
    .select("*")
    .eq("customer_id", customerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-dim flex items-center justify-center">
            <Anvil className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold">Skill Forge</h3>
            <p className="text-foreground/60 text-sm">
              Teach your assistant new abilities
            </p>
          </div>
        </div>

        <Link
          href="/settings/skills/forge/new"
          className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Skill
        </Link>
      </div>

      <SkillForgeLibrary initialSkills={skills || []} />
    </div>
  );
}
