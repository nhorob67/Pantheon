import { tool } from "ai";
import { z } from "zod";
import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent, TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import {
  listTenantRuntimeAgents,
  createTenantRuntimeAgent,
  updateTenantRuntimeAgent,
  deleteTenantRuntimeAgent,
  buildTenantAgentContext,
} from "@/lib/runtime/tenant-agents";

export interface SelfConfigToolsInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agent: TenantAgent;
  actorRole: TenantRole;
  actorDiscordId: string | null;
  runtimeRun?: TenantRuntimeRun;
  legacyInstanceId: string | null;
}

// Role precedence: owner=400, admin=300, operator=200, viewer=100
const ROLE_PRECEDENCE: Record<TenantRole, number> = {
  owner: 400,
  admin: 300,
  operator: 200,
  viewer: 100,
};

function requireRole(minRole: TenantRole, actualRole: TenantRole): boolean {
  return ROLE_PRECEDENCE[actualRole] >= ROLE_PRECEDENCE[minRole];
}

function roleDenied(minRole: TenantRole): string {
  return `This requires ${minRole} permissions. Ask your team owner to make this change or link your Discord account.`;
}

function undoExpiry(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function changeResult(summary: string, oldValue: unknown, newValue: unknown) {
  return {
    applied: true,
    change_summary: summary,
    previous_value: oldValue,
    new_value: newValue,
    undo_available: true,
    undo_window_expires: undoExpiry(),
  };
}

const MAX_CHANGELOG_PER_TENANT = 20;

async function recordConfigChange(
  admin: SupabaseClient,
  params: {
    tenantId: string;
    customerId: string;
    agentId: string | null;
    toolName: string;
    fieldChanged: string;
    entityType: "agent" | "team_profile";
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    actorRole: string;
    actorDiscordId: string | null;
    runId: string | null;
  }
): Promise<void> {
  await admin.from("tenant_config_changelog").insert({
    tenant_id: params.tenantId,
    customer_id: params.customerId,
    agent_id: params.agentId,
    tool_name: params.toolName,
    field_changed: params.fieldChanged,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_value: params.oldValue,
    new_value: params.newValue,
    actor_role: params.actorRole,
    actor_discord_id: params.actorDiscordId,
    run_id: params.runId,
  });

  // Enforce max 20 rows per tenant — delete oldest beyond limit
  const { data: rows } = await admin
    .from("tenant_config_changelog")
    .select("id")
    .eq("tenant_id", params.tenantId)
    .order("created_at", { ascending: false })
    .range(MAX_CHANGELOG_PER_TENANT, MAX_CHANGELOG_PER_TENANT + 50);

  if (rows && rows.length > 0) {
    const idsToDelete = rows.map((r: { id: string }) => r.id);
    await admin
      .from("tenant_config_changelog")
      .delete()
      .in("id", idsToDelete);
  }
}

export function createSelfConfigTools(
  input: SelfConfigToolsInput
): Record<string, Tool> {
  const {
    admin,
    tenantId,
    customerId,
    agent,
    actorRole,
    actorDiscordId,
    runtimeRun,
    legacyInstanceId,
  } = input;

  const runId = runtimeRun?.id ?? null;
  const ctx = buildTenantAgentContext(tenantId, customerId, legacyInstanceId);
  const agentConfig = agent.config ?? {};

  const tools: Record<string, Tool> = {};

  // ── config_view_my_config (viewer) ───────────────────────────
  tools.config_view_my_config = tool({
    description:
      "View the current agent's configuration: name, role, goal, backstory, autonomy, delegation, skills, channel binding, and cron jobs.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        agent_id: agent.id,
        display_name: agent.display_name,
        role: agentConfig.role ?? null,
        skills: agent.skills ?? [],
        goal: agentConfig.goal ?? null,
        backstory: agentConfig.backstory ?? null,
        autonomy_level: agentConfig.autonomy_level ?? "copilot",
        can_delegate: agentConfig.can_delegate ?? false,
        can_receive_delegation: agentConfig.can_receive_delegation ?? false,
        discord_channel_id: agentConfig.discord_channel_id ?? null,
        discord_channel_name: agentConfig.discord_channel_name ?? null,
        cron_jobs: agentConfig.cron_jobs ?? {},
        is_default: agent.is_default,
      };
    },
  });

  // ── config_list_agents (viewer) ──────────────────────────────
  tools.config_list_agents = tool({
    description: "List all active agents on this team.",
    inputSchema: z.object({}),
    execute: async () => {
      const agents = await listTenantRuntimeAgents(admin, ctx);
      return {
        agents: agents.map((a) => ({
          id: a.id,
          display_name: a.display_name,
          role: a.role ?? null,
          autonomy_level: a.autonomy_level,
          skills: a.skills,
          is_default: a.is_default,
          channel: a.discord_channel_name ?? a.discord_channel_id ?? "all channels",
        })),
      };
    },
  });

  // ── config_set_my_goal (operator) ────────────────────────────
  tools.config_set_my_goal = tool({
    description:
      "Set a goal for this agent (max 300 chars). Describes what this agent should focus on.",
    inputSchema: z.object({
      goal: z.string().min(1).max(300),
    }),
    execute: async ({ goal }) => {
      if (!requireRole("operator", actorRole)) {
        return { error: roleDenied("operator") };
      }
      const oldGoal = agentConfig.goal ?? null;
      await updateTenantRuntimeAgent(admin, ctx, agent.id, { goal });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_my_goal",
        fieldChanged: "goal", entityType: "agent", entityId: agent.id,
        oldValue: oldGoal, newValue: goal, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Goal updated to: "${goal}"`, oldGoal, goal);
    },
  });

  // ── config_set_my_role (operator) ────────────────────────────
  tools.config_set_my_role = tool({
    description:
      "Set this agent's role (max 200 chars). Describes what this agent is responsible for.",
    inputSchema: z.object({
      role: z.string().min(1).max(200),
    }),
    execute: async ({ role }) => {
      if (!requireRole("operator", actorRole)) {
        return { error: roleDenied("operator") };
      }
      const oldRole = agentConfig.role ?? null;
      await updateTenantRuntimeAgent(admin, ctx, agent.id, { role });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_my_role",
        fieldChanged: "role", entityType: "agent", entityId: agent.id,
        oldValue: oldRole, newValue: role, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Role updated to: "${role}"`, oldRole, role);
    },
  });

  // ── config_set_my_backstory (operator) ───────────────────────
  tools.config_set_my_backstory = tool({
    description:
      "Set context/backstory for this agent (max 1000 chars). Background info the agent should know.",
    inputSchema: z.object({
      backstory: z.string().min(1).max(1000),
    }),
    execute: async ({ backstory }) => {
      if (!requireRole("operator", actorRole)) {
        return { error: roleDenied("operator") };
      }
      const oldBackstory = agentConfig.backstory ?? null;
      await updateTenantRuntimeAgent(admin, ctx, agent.id, { backstory });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_my_backstory",
        fieldChanged: "backstory", entityType: "agent", entityId: agent.id,
        oldValue: oldBackstory, newValue: backstory, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Backstory updated.`, oldBackstory, backstory);
    },
  });

  // ── config_set_display_name (admin) ──────────────────────────
  tools.config_set_display_name = tool({
    description: "Change this agent's display name (1-50 chars).",
    inputSchema: z.object({
      display_name: z.string().min(1).max(50),
    }),
    execute: async ({ display_name }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      const oldName = agent.display_name;
      await updateTenantRuntimeAgent(admin, ctx, agent.id, { display_name });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_display_name",
        fieldChanged: "display_name", entityType: "agent", entityId: agent.id,
        oldValue: oldName, newValue: display_name, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Display name changed from "${oldName}" to "${display_name}".`, oldName, display_name);
    },
  });

  // ── config_set_my_autonomy (admin) ───────────────────────────
  tools.config_set_my_autonomy = tool({
    description:
      "Set this agent's autonomy level.",
    inputSchema: z.object({
      autonomy_level: z.enum(["assisted", "copilot", "autopilot"]),
    }),
    execute: async ({ autonomy_level }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      const oldAutonomy = agentConfig.autonomy_level ?? "copilot";
      await updateTenantRuntimeAgent(admin, ctx, agent.id, { autonomy_level });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_my_autonomy",
        fieldChanged: "autonomy_level", entityType: "agent", entityId: agent.id,
        oldValue: oldAutonomy, newValue: autonomy_level, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Autonomy updated to "${autonomy_level}".`, oldAutonomy, autonomy_level);
    },
  });

  // ── config_toggle_skill (admin) ──────────────────────────────
  tools.config_toggle_skill = tool({
    description:
      "Add or remove a custom skill from this agent by slug.",
    inputSchema: z.object({
      skill: z.string().min(1),
      enable: z.boolean().describe("true to add, false to remove"),
    }),
    execute: async ({ skill, enable }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      const currentSkills = [...(agent.skills ?? [])];
      const hasSkill = currentSkills.includes(skill);

      if (enable && hasSkill) {
        return { error: `Skill "${skill}" is already enabled.` };
      }
      if (!enable && !hasSkill) {
        return { error: `Skill "${skill}" is already disabled.` };
      }

      const newSkills = enable
        ? [...currentSkills, skill]
        : currentSkills.filter((s) => s !== skill);

      await updateTenantRuntimeAgent(admin, ctx, agent.id, { skills: newSkills });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_toggle_skill",
        fieldChanged: "skills", entityType: "agent", entityId: agent.id,
        oldValue: currentSkills, newValue: newSkills, actorRole, actorDiscordId, runId,
      });
      const action = enable ? "enabled" : "disabled";
      return changeResult(`Skill "${skill}" ${action}.`, currentSkills, newSkills);
    },
  });

  // ── config_set_my_delegation (admin) ─────────────────────────
  tools.config_set_my_delegation = tool({
    description:
      "Control whether this agent can delegate tasks and receive delegated tasks.",
    inputSchema: z.object({
      can_delegate: z.boolean(),
      can_receive_delegation: z.boolean(),
    }),
    execute: async ({ can_delegate, can_receive_delegation }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      const oldDelegation = {
        can_delegate: agentConfig.can_delegate ?? false,
        can_receive_delegation: agentConfig.can_receive_delegation ?? false,
      };
      await updateTenantRuntimeAgent(admin, ctx, agent.id, {
        can_delegate,
        can_receive_delegation,
      });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_my_delegation",
        fieldChanged: "delegation_policy", entityType: "agent", entityId: agent.id,
        oldValue: oldDelegation,
        newValue: { can_delegate, can_receive_delegation },
        actorRole, actorDiscordId, runId,
      });
      return changeResult(
        "Delegation settings updated.",
        oldDelegation,
        { can_delegate, can_receive_delegation }
      );
    },
  });

  // ── config_update_team_profile (owner) ───────────────────────
  tools.config_update_team_profile = tool({
    description:
      "Update team profile fields: team_name, description, industry, team_goal. Timezone must be changed on the dashboard.",
    inputSchema: z.object({
      team_name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      industry: z.string().max(100).optional(),
      team_goal: z.string().max(500).optional(),
    }),
    execute: async (params) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }

      const { data: teamProfile } = await admin
        .from("team_profiles")
        .select("id, team_name, description, industry, team_goal")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (!teamProfile) {
        return { error: "Team profile not found." };
      }

      const updateFields: Record<string, unknown> = {};
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      if (params.team_name !== undefined) {
        oldValues.team_name = teamProfile.team_name;
        newValues.team_name = params.team_name;
        updateFields.team_name = params.team_name;
      }
      if (params.description !== undefined) {
        oldValues.description = teamProfile.description;
        newValues.description = params.description;
        updateFields.description = params.description;
      }
      if (params.industry !== undefined) {
        oldValues.industry = teamProfile.industry;
        newValues.industry = params.industry;
        updateFields.industry = params.industry;
      }
      if (params.team_goal !== undefined) {
        oldValues.team_goal = teamProfile.team_goal;
        newValues.team_goal = params.team_goal;
        updateFields.team_goal = params.team_goal;
      }

      if (Object.keys(updateFields).length === 0) {
        return { error: "No fields to update." };
      }

      const { error: updateError } = await admin
        .from("team_profiles")
        .update(updateFields)
        .eq("id", teamProfile.id);

      if (updateError) {
        return { error: "Failed to update team profile." };
      }

      const changedFields = Object.keys(updateFields).join(", ");
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: null, toolName: "config_update_team_profile",
        fieldChanged: changedFields, entityType: "team_profile", entityId: teamProfile.id,
        oldValue: oldValues, newValue: newValues, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Team profile updated: ${changedFields}.`, oldValues, newValues);
    },
  });

  // ── config_create_agent (owner) ──────────────────────────────
  tools.config_create_agent = tool({
    description:
      "Create a new agent for this team using explicit role, goal, backstory, autonomy, and delegation settings.",
    inputSchema: z.object({
      display_name: z.string().min(1).max(50),
      role: z.string().min(1).max(200).optional(),
      goal: z.string().max(300).optional(),
      backstory: z.string().max(1000).optional(),
      autonomy_level: z.enum(["assisted", "copilot", "autopilot"]).optional(),
      can_delegate: z.boolean().optional(),
      can_receive_delegation: z.boolean().optional(),
    }),
    execute: async ({
      display_name,
      role,
      goal,
      backstory,
      autonomy_level,
      can_delegate,
      can_receive_delegation,
    }) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }

      // Check max 6 agents
      const agents = await listTenantRuntimeAgents(admin, ctx);
      if (agents.length >= 6) {
        return { error: "Maximum of 6 agents per team. Archive an agent first." };
      }

      const created = await createTenantRuntimeAgent(admin, ctx, {
        display_name,
        role: role ?? "",
        goal: goal ?? "",
        backstory: backstory ?? "",
        autonomy_level: autonomy_level ?? "copilot",
        is_default: false,
        skills: [],
        composio_toolkits: [],
        can_delegate: can_delegate ?? false,
        can_receive_delegation: can_receive_delegation ?? false,
        tool_approval_overrides: {},
      });

      await recordConfigChange(admin, {
        tenantId, customerId, agentId: created.id, toolName: "config_create_agent",
        fieldChanged: "agent_created", entityType: "agent", entityId: created.id,
        oldValue: null,
        newValue: {
          display_name,
          role: role ?? null,
          goal: goal ?? null,
          backstory: backstory ?? null,
          autonomy_level: autonomy_level ?? "copilot",
          can_delegate: can_delegate ?? false,
          can_receive_delegation: can_receive_delegation ?? false,
        },
        actorRole, actorDiscordId, runId,
      });

      return {
        applied: true,
        change_summary: `Created agent "${display_name}".`,
        agent_id: created.id,
        display_name: created.display_name,
        role: created.role,
        autonomy_level: created.autonomy_level,
        skills: created.skills,
        undo_available: false,
        undo_note: "Use config_archive_agent to remove this agent.",
      };
    },
  });

  // ── config_archive_agent (owner) ─────────────────────────────
  tools.config_archive_agent = tool({
    description:
      "Archive (remove) an agent. Cannot archive the last agent or the agent responding to this message.",
    inputSchema: z.object({
      agent_id: z.string().uuid(),
    }),
    execute: async ({ agent_id }) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }
      if (agent_id === agent.id) {
        return { error: "An agent cannot archive itself. Ask from a different agent's channel or use the dashboard." };
      }

      try {
        await deleteTenantRuntimeAgent(admin, ctx, agent_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { error: msg };
      }

      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent_id, toolName: "config_archive_agent",
        fieldChanged: "agent_archived", entityType: "agent", entityId: agent_id,
        oldValue: { agent_id }, newValue: null, actorRole, actorDiscordId, runId,
      });

      return {
        applied: true,
        change_summary: `Agent ${agent_id} archived.`,
        undo_available: false,
        undo_note: "Use config_create_agent to recreate an agent.",
      };
    },
  });

  // ── config_undo_last_change (admin) ──────────────────────────
  tools.config_undo_last_change = tool({
    description:
      "Undo the most recent configuration change (within 24 hours). Cannot undo agent creation or archival.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: entry, error: fetchError } = await admin
        .from("tenant_config_changelog")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("undone_at", null)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !entry) {
        return { error: "No undoable changes found in the last 24 hours." };
      }

      // Cannot undo create/archive
      if (entry.tool_name === "config_create_agent") {
        return { error: "Cannot undo agent creation. Use config_archive_agent instead." };
      }
      if (entry.tool_name === "config_archive_agent") {
        return { error: "Cannot undo agent archival. Use config_create_agent to recreate." };
      }

      // Apply old_value back
      if (entry.entity_type === "agent" && entry.entity_id) {
        const fieldChanged = entry.field_changed as string;
        const oldValue = entry.old_value;

        if (fieldChanged === "skills") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { skills: oldValue as string[] });
        } else if (fieldChanged === "role") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { role: (oldValue as string) || "" });
        } else if (fieldChanged === "goal") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { goal: (oldValue as string) || "" });
        } else if (fieldChanged === "backstory") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { backstory: (oldValue as string) || "" });
        } else if (fieldChanged === "display_name") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { display_name: oldValue as string });
        } else if (fieldChanged === "autonomy_level") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, {
            autonomy_level:
              oldValue === "assisted" || oldValue === "copilot" || oldValue === "autopilot"
                ? oldValue
                : "copilot",
          });
        } else if (fieldChanged === "delegation_policy") {
          const oldPolicy =
            oldValue && typeof oldValue === "object" && !Array.isArray(oldValue)
              ? (oldValue as Record<string, unknown>)
              : {};
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, {
            can_delegate: oldPolicy.can_delegate === true,
            can_receive_delegation: oldPolicy.can_receive_delegation === true,
          });
        } else {
          return { error: `Cannot undo field "${fieldChanged}" automatically.` };
        }
      } else if (entry.entity_type === "team_profile" && entry.entity_id) {
        const oldValues = entry.old_value as Record<string, unknown> | null;
        if (oldValues && Object.keys(oldValues).length > 0) {
          await admin
            .from("team_profiles")
            .update(oldValues)
            .eq("id", entry.entity_id);
        }
      } else {
        return { error: "Cannot undo this change type." };
      }

      // Mark as undone
      await admin
        .from("tenant_config_changelog")
        .update({ undone_at: new Date().toISOString() })
        .eq("id", entry.id);

      return {
        applied: true,
        change_summary: `Undid "${entry.tool_name}" on ${entry.field_changed}. Reverted to previous value.`,
        reverted_tool: entry.tool_name,
        reverted_field: entry.field_changed,
        previous_value: entry.new_value,
        restored_value: entry.old_value,
      };
    },
  });

  return tools;
}
