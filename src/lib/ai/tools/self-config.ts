import { tool } from "ai";
import { z } from "zod";
import type { Tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent, TenantRole, TenantRuntimeRun } from "@/types/tenant-runtime";
import {
  PERSONALITY_PRESETS,
  PERSONALITY_PRESET_SET,
  PRESET_DEFAULT_SKILLS,
  PRESET_DEFAULT_CRONS,
  BUILT_IN_SKILL_SLUGS,
  type PersonalityPreset,
} from "@/types/agent";
import { CROPS } from "@/types/farm";
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
  return `This requires ${minRole} permissions. Ask your farm owner to make this change or link your Discord account.`;
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
    entityType: "agent" | "farm_profile";
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

function hasInjectionAttempt(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("<script") ||
    lower.includes("ignore previous instructions") ||
    lower.includes("ignore all previous") ||
    lower.includes("disregard previous")
  );
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
      "View the current agent's configuration: name, personality preset, skills, goal, backstory, channel binding, and cron jobs.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        agent_id: agent.id,
        display_name: agent.display_name,
        personality_preset: agentConfig.personality_preset ?? "general",
        custom_personality: agentConfig.custom_personality ?? null,
        skills: agent.skills ?? [],
        goal: agentConfig.goal ?? null,
        backstory: agentConfig.backstory ?? null,
        discord_channel_id: agentConfig.discord_channel_id ?? null,
        discord_channel_name: agentConfig.discord_channel_name ?? null,
        cron_jobs: agentConfig.cron_jobs ?? {},
        is_default: agent.is_default,
      };
    },
  });

  // ── config_list_agents (viewer) ──────────────────────────────
  tools.config_list_agents = tool({
    description: "List all active agents on this farm.",
    inputSchema: z.object({}),
    execute: async () => {
      const agents = await listTenantRuntimeAgents(admin, ctx);
      return {
        agents: agents.map((a) => ({
          id: a.id,
          display_name: a.display_name,
          personality_preset: a.personality_preset,
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

  // ── config_set_personality_preset (admin) ────────────────────
  tools.config_set_personality_preset = tool({
    description: `Change this agent's personality preset. Valid presets: ${PERSONALITY_PRESETS.join(", ")}`,
    inputSchema: z.object({
      preset: z.enum(PERSONALITY_PRESETS),
    }),
    execute: async ({ preset }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      const oldPreset = agentConfig.personality_preset ?? "general";
      const patch: Record<string, unknown> = { personality_preset: preset };
      // Clear custom personality when switching away from "custom"
      if (preset !== "custom" && agentConfig.custom_personality) {
        patch.custom_personality = null;
      }
      await updateTenantRuntimeAgent(admin, ctx, agent.id, patch);
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_personality_preset",
        fieldChanged: "personality_preset", entityType: "agent", entityId: agent.id,
        oldValue: oldPreset, newValue: preset, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Personality changed from "${oldPreset}" to "${preset}".`, oldPreset, preset);
    },
  });

  // ── config_toggle_skill (admin) ──────────────────────────────
  tools.config_toggle_skill = tool({
    description:
      "Add or remove a skill from this agent. Built-in skills: farm-grain-bids, farm-weather, farm-scale-tickets.",
    inputSchema: z.object({
      skill: z.string().min(1),
      enable: z.boolean().describe("true to add, false to remove"),
    }),
    execute: async ({ skill, enable }) => {
      if (!requireRole("admin", actorRole)) {
        return { error: roleDenied("admin") };
      }
      if (!BUILT_IN_SKILL_SLUGS.has(skill)) {
        return { error: `Unknown skill "${skill}". Available: farm-grain-bids, farm-weather, farm-scale-tickets.` };
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

  // ── config_set_custom_personality (owner) ────────────────────
  tools.config_set_custom_personality = tool({
    description:
      "Set a fully custom personality for this agent (10-5000 chars). Automatically switches preset to 'custom'.",
    inputSchema: z.object({
      personality: z.string().min(10).max(5000),
    }),
    execute: async ({ personality }) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }
      if (hasInjectionAttempt(personality)) {
        return { error: "The personality text contains disallowed content. Please remove any script tags or instruction override attempts." };
      }
      const oldPersonality = agentConfig.custom_personality ?? null;
      await updateTenantRuntimeAgent(admin, ctx, agent.id, {
        personality_preset: "custom" as PersonalityPreset,
        custom_personality: personality,
      });
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: agent.id, toolName: "config_set_custom_personality",
        fieldChanged: "custom_personality", entityType: "agent", entityId: agent.id,
        oldValue: oldPersonality, newValue: personality, actorRole, actorDiscordId, runId,
      });
      return changeResult("Custom personality applied. Preset set to 'custom'.", oldPersonality, personality);
    },
  });

  // ── config_update_farm_profile (owner) ───────────────────────
  const VALID_CROPS_SET = new Set<string>(CROPS);

  tools.config_update_farm_profile = tool({
    description:
      "Update basic farm profile fields: farm_name, acres, primary_crops, county. Other fields (state, coordinates, timezone) must be changed on the dashboard.",
    inputSchema: z.object({
      farm_name: z.string().min(1).max(100).optional(),
      acres: z.number().int().min(1).max(999999).optional(),
      primary_crops: z.array(z.string()).min(1).max(10).optional(),
      county: z.string().min(1).max(100).optional(),
    }),
    execute: async (params) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }

      // Validate crops
      if (params.primary_crops) {
        const invalid = params.primary_crops.filter((c) => !VALID_CROPS_SET.has(c));
        if (invalid.length > 0) {
          return { error: `Unknown crops: ${invalid.join(", ")}. Valid: ${CROPS.join(", ")}` };
        }
      }

      // Read current profile
      const { data: profile, error: profileError } = await admin
        .from("farm_profiles")
        .select("id, farm_name, acres, primary_crops, county")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (profileError || !profile) {
        return { error: "Farm profile not found." };
      }

      const updateFields: Record<string, unknown> = {};
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      if (params.farm_name !== undefined) {
        oldValues.farm_name = profile.farm_name;
        newValues.farm_name = params.farm_name;
        updateFields.farm_name = params.farm_name;
      }
      if (params.acres !== undefined) {
        oldValues.acres = profile.acres;
        newValues.acres = params.acres;
        updateFields.acres = params.acres;
      }
      if (params.primary_crops !== undefined) {
        oldValues.primary_crops = profile.primary_crops;
        newValues.primary_crops = params.primary_crops;
        updateFields.primary_crops = params.primary_crops;
      }
      if (params.county !== undefined) {
        oldValues.county = profile.county;
        newValues.county = params.county;
        updateFields.county = params.county;
      }

      if (Object.keys(updateFields).length === 0) {
        return { error: "No fields to update." };
      }

      const { error: updateError } = await admin
        .from("farm_profiles")
        .update(updateFields)
        .eq("id", profile.id);

      if (updateError) {
        return { error: "Failed to update farm profile." };
      }

      const changedFields = Object.keys(updateFields).join(", ");
      await recordConfigChange(admin, {
        tenantId, customerId, agentId: null, toolName: "config_update_farm_profile",
        fieldChanged: changedFields, entityType: "farm_profile", entityId: profile.id,
        oldValue: oldValues, newValue: newValues, actorRole, actorDiscordId, runId,
      });
      return changeResult(`Farm profile updated: ${changedFields}.`, oldValues, newValues);
    },
  });

  // ── config_create_agent (owner) ──────────────────────────────
  tools.config_create_agent = tool({
    description:
      "Create a new agent for this farm. Optionally specify a personality preset for smart defaults.",
    inputSchema: z.object({
      display_name: z.string().min(1).max(50),
      personality_preset: z.enum(PERSONALITY_PRESETS).optional(),
    }),
    execute: async ({ display_name, personality_preset }) => {
      if (!requireRole("owner", actorRole)) {
        return { error: roleDenied("owner") };
      }

      // Check max 6 agents
      const agents = await listTenantRuntimeAgents(admin, ctx);
      if (agents.length >= 6) {
        return { error: "Maximum of 6 agents per farm. Archive an agent first." };
      }

      const preset = personality_preset ?? "general";
      const defaultSkills = PRESET_DEFAULT_SKILLS[preset] ?? [];
      const defaultCronList = PRESET_DEFAULT_CRONS[preset] ?? [];
      const defaultCrons: Record<string, boolean> = {};
      for (const cron of defaultCronList) {
        defaultCrons[cron] = true;
      }

      const created = await createTenantRuntimeAgent(admin, ctx, {
        display_name,
        personality_preset: preset,
        is_default: false,
        skills: [...defaultSkills],
        cron_jobs: defaultCrons,
      });

      await recordConfigChange(admin, {
        tenantId, customerId, agentId: created.id, toolName: "config_create_agent",
        fieldChanged: "agent_created", entityType: "agent", entityId: created.id,
        oldValue: null, newValue: { display_name, personality_preset: preset },
        actorRole, actorDiscordId, runId,
      });

      return {
        applied: true,
        change_summary: `Created agent "${display_name}" with ${preset} preset.`,
        agent_id: created.id,
        display_name: created.display_name,
        personality_preset: preset,
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
        } else if (fieldChanged === "goal") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { goal: (oldValue as string) || "" });
        } else if (fieldChanged === "backstory") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { backstory: (oldValue as string) || "" });
        } else if (fieldChanged === "display_name") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { display_name: oldValue as string });
        } else if (fieldChanged === "personality_preset") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, { personality_preset: oldValue as PersonalityPreset });
        } else if (fieldChanged === "custom_personality") {
          await updateTenantRuntimeAgent(admin, ctx, entry.entity_id, {
            custom_personality: (oldValue as string) || "",
            personality_preset: oldValue ? ("custom" as PersonalityPreset) : ("general" as PersonalityPreset),
          });
        } else {
          return { error: `Cannot undo field "${fieldChanged}" automatically.` };
        }
      } else if (entry.entity_type === "farm_profile" && entry.entity_id) {
        const oldValues = entry.old_value as Record<string, unknown> | null;
        if (oldValues && Object.keys(oldValues).length > 0) {
          await admin
            .from("farm_profiles")
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
