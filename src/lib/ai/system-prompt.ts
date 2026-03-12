import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import { toAutonomyLevel } from "@/types/agent";
import { renderAgentSoul, type AgentSoulData } from "@/lib/templates/agent-soul";
import {
  resolveCustomSkillsForAgent,
  formatCustomSkillsForPrompt,
} from "./custom-skill-resolver";

interface TeamProfileRow {
  team_name: string;
  team_goal: string | null;
  timezone: string;
}

export async function buildSystemPrompt(
  admin: SupabaseClient,
  agent: TenantAgent
): Promise<string> {
  const config = agent.config || {};
  const agentRole = typeof config.role === "string" ? config.role : (agent.display_name || "AI Assistant");
  const agentGoal = typeof config.goal === "string" ? config.goal : null;
  const agentBackstory = typeof config.backstory === "string" ? config.backstory : null;
  const autonomyLevel = toAutonomyLevel(config.autonomy_level);
  const canDelegate = config.can_delegate === true;
  const canReceiveDelegation = config.can_receive_delegation === true;

  // Parallelize independent DB queries
  const [teamProfileResult, siblingsResult, kFilesResult] = await Promise.all([
    admin
      .from("team_profiles")
      .select("team_name, team_goal, timezone")
      .eq("customer_id", agent.customer_id)
      .maybeSingle(),
    canDelegate
      ? admin
          .from("tenant_agents")
          .select("display_name")
          .eq("tenant_id", agent.tenant_id)
          .neq("id", agent.id)
          .neq("status", "archived")
      : Promise.resolve({ data: null }),
    admin
      .from("knowledge_files")
      .select("display_name")
      .or(`agent_id.eq.${agent.id},agent_id.is.null`)
      .eq("customer_id", agent.customer_id),
  ]);

  const resolvedProfile = (teamProfileResult.data as TeamProfileRow | null) || {
    team_name: "Your Team",
    team_goal: "Assist with daily operations",
    timezone: "America/Chicago",
  };

  const otherAgents = (siblingsResult.data as Array<{ display_name: string }> | null)?.map((s) => s.display_name) ?? [];
  const knowledgeFiles = (kFilesResult.data as Array<{ display_name: string }> | null)?.map((k) => k.display_name) ?? [];

  const soulData: AgentSoulData = {
    team_name: resolvedProfile.team_name,
    team_goal: resolvedProfile.team_goal || "Assist with daily operations",
    timezone: resolvedProfile.timezone,
    agent_name: agent.display_name,
    role: agentRole,
    goal: agentGoal || "Help the team accomplish its goals",
    backstory: agentBackstory,
    autonomy_level: autonomyLevel,
    can_delegate: canDelegate,
    can_receive_delegation: canReceiveDelegation,
    skills: agent.skills || [],
    other_agents: otherAgents,
    knowledge_files: knowledgeFiles,
  };

  let systemPrompt = renderAgentSoul(soulData);

  // Append tool approval overrides (prompt-based soft HITL)
  const toolOverrides = (config.tool_approval_overrides ?? {}) as Record<string, string>;
  const confirmTools: string[] = [];
  const disabledTools: string[] = [];
  for (const [key, level] of Object.entries(toolOverrides)) {
    if (level === "confirm") confirmTools.push(key);
    else if (level === "disabled") disabledTools.push(key);
  }

  if (confirmTools.length > 0) {
    systemPrompt += `\n\n## Tool Approval Required\n\nBefore using the following tools, you MUST ask the user for explicit permission first. Explain what you intend to do and wait for their confirmation before proceeding:\n${confirmTools.map((t) => `- \`${t}\``).join("\n")}`;
  }
  if (disabledTools.length > 0) {
    systemPrompt += `\n\n## Disabled Tools\n\nThe following tools have been disabled. Do not attempt to use them. If asked about functionality they provide, explain that the tool is currently disabled and suggest enabling it in settings:\n${disabledTools.map((t) => `- \`${t}\``).join("\n")}`;
  }

  // Append active skill descriptions
  if (agent.skills && agent.skills.length > 0) {
    systemPrompt += `\n\n## Active Skills\n\nYou have the following skills enabled: ${agent.skills.join(", ")}.\n`;
    systemPrompt += `Use your tools when the user asks about topics covered by these skills.`;
  }

  // Append custom skills (SKILL.md content injected into prompt)
  const customSkills = await resolveCustomSkillsForAgent(
    admin,
    agent.customer_id,
    agent.skills || []
  );
  const customSkillsSection = formatCustomSkillsForPrompt(customSkills);
  if (customSkillsSection) {
    systemPrompt += `\n\n${customSkillsSection}`;
  }

  return systemPrompt;
}
