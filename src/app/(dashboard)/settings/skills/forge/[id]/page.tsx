import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { SkillEditorClient } from "@/components/settings/skill-editor-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: skill } = await admin
    .from("custom_skills")
    .select("display_name")
    .eq("id", id)
    .single();

  return {
    title: skill
      ? `${skill.display_name} | Skill Forge | FarmClaw`
      : "Skill Editor | FarmClaw",
  };
}

export default async function SkillEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireDashboardCustomer();
  const admin = createAdminClient();

  // Fetch skill with ownership check
  const { data: skill } = await admin
    .from("custom_skills")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!skill || skill.customers.user_id !== user.id) {
    notFound();
  }

  // Fetch version history
  const { data: versions } = await admin
    .from("custom_skill_versions")
    .select("*")
    .eq("skill_id", skill.id)
    .order("version", { ascending: false });

  // Strip the join column before passing to client
  const { customers: _, ...skillWithoutJoin } = skill;

  return (
    <SkillEditorClient
      initialSkill={skillWithoutJoin}
      initialVersions={versions || []}
    />
  );
}
