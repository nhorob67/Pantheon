export interface TenantExportSkillsMetadata {
  customer_id: string;
  custom_skills: {
    total: number;
    by_status: Record<string, number>;
    slugs: string[];
  };
  agent_skill_references: {
    total_assignments: number;
    unique_skill_names: number;
    top_skill_names: string[];
  };
}

function parseSkillNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function summarizeAgentSkillReferences(
  tenantAgentRows: Record<string, unknown>[]
): TenantExportSkillsMetadata["agent_skill_references"] {
  const usageCounts = new Map<string, number>();
  let totalAssignments = 0;

  for (const row of tenantAgentRows) {
    const skills = parseSkillNames((row as { skills?: unknown }).skills);
    totalAssignments += skills.length;
    for (const skillName of skills) {
      usageCounts.set(skillName, (usageCounts.get(skillName) || 0) + 1);
    }
  }

  const topSkillNames = [...usageCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([skillName]) => skillName);

  return {
    total_assignments: totalAssignments,
    unique_skill_names: usageCounts.size,
    top_skill_names: topSkillNames,
  };
}

export function summarizeCustomSkillsMetadata(
  customSkillRows: Record<string, unknown>[]
): TenantExportSkillsMetadata["custom_skills"] {
  const statusCounts: Record<string, number> = {};
  const slugs: string[] = [];

  for (const row of customSkillRows) {
    const status =
      typeof (row as { status?: unknown }).status === "string"
        ? ((row as { status: string }).status || "unknown")
        : "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const slug = (row as { slug?: unknown }).slug;
    if (typeof slug === "string" && slug.trim().length > 0) {
      slugs.push(slug.trim());
    }
  }

  slugs.sort((a, b) => a.localeCompare(b));

  return {
    total: customSkillRows.length,
    by_status: statusCounts,
    slugs,
  };
}
