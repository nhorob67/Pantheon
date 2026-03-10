import type { Metadata } from "next";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { SKILL_TEMPLATES } from "@/lib/custom-skills/templates";
import { NewSkillClient } from "@/components/settings/new-skill-client";

export const metadata: Metadata = { title: "Create Skill | FarmClaw" };

export default async function NewSkillPage() {
  await requireDashboardCustomer();

  return <NewSkillClient templates={SKILL_TEMPLATES} />;
}
