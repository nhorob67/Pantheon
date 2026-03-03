import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedCustomSkill {
  slug: string;
  name: string;
  body: string;
}

export async function resolveCustomSkillsForAgent(
  admin: SupabaseClient,
  customerId: string,
  agentSkills: string[]
): Promise<ResolvedCustomSkill[]> {
  if (agentSkills.length === 0) return [];

  // Custom skills have slugs prefixed with "custom:" in the agent's skills array
  const customSlugs = agentSkills
    .filter((s) => s.startsWith("custom:"))
    .map((s) => s.slice(7));

  if (customSlugs.length === 0) return [];

  const { data, error } = await admin
    .from("custom_skills")
    .select("slug, name, content")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .in("slug", customSlugs);

  if (error || !data) return [];

  return data.map((row) => ({
    slug: row.slug,
    name: row.name,
    body: stripFrontmatter(row.content || ""),
  }));
}

export function formatCustomSkillsForPrompt(skills: ResolvedCustomSkill[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map(
    (skill) => `## Custom Skill: ${skill.name}\n\n${skill.body}`
  );

  return `## Custom Skills\n\n${sections.join("\n\n---\n\n")}`;
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}
