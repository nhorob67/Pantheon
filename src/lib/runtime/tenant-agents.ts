import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateAgentData, UpdateAgentData } from "@/lib/validators/agent";
import { toPersonalityPreset, type PersonalityPreset, type ToolApprovalLevel } from "@/types/agent";
import { safeErrorMessage } from "@/lib/security/safe-error";

import { syncPredefinedSchedulesToTable } from "@/lib/schedules/sync-predefined-schedules";

const TENANT_AGENT_SELECT =
  "id, tenant_id, customer_id, legacy_agent_id, agent_key, display_name, status, policy_profile, is_default, sort_order, skills, config, created_at, updated_at";
const LEGACY_AGENT_SELECT =
  "id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order, created_at, updated_at";

interface TenantAgentRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_agent_id: string | null;
  agent_key: string;
  display_name: string;
  status: string;
  policy_profile: string;
  is_default: boolean;
  sort_order: number;
  skills: string[];
  config: unknown;
  created_at: string;
  updated_at: string;
}

interface LegacyAgentRow {
  id: string;
  instance_id: string;
  customer_id: string;
  agent_key: string;
  display_name: string;
  personality_preset: PersonalityPreset;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  cron_jobs: Record<string, boolean>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TenantInstanceMappingRow {
  instance_id: string;
}

interface TenantAgentConfig {
  personality_preset: PersonalityPreset;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  cron_jobs: Record<string, boolean>;
  composio_toolkits: string[];
  goal: string | null;
  backstory: string | null;
  tool_approval_overrides: Record<string, ToolApprovalLevel>;
}

interface TenantAgentConfigPatch {
  personality_preset?: PersonalityPreset;
  custom_personality?: string | null;
  discord_channel_id?: string | null;
  discord_channel_name?: string | null;
  cron_jobs?: Record<string, boolean>;
  composio_toolkits?: string[];
  goal?: string | null;
  backstory?: string | null;
  tool_approval_overrides?: Record<string, ToolApprovalLevel>;
}

export interface TenantRuntimeAgent {
  id: string;
  tenant_id: string;
  customer_id: string;
  legacy_agent_id: string | null;
  agent_key: string;
  display_name: string;
  personality_preset: PersonalityPreset;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  cron_jobs: Record<string, boolean>;
  composio_toolkits: string[];
  goal: string | null;
  backstory: string | null;
  tool_approval_overrides: Record<string, ToolApprovalLevel>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}


export interface TenantAgentMutationContext {
  tenantId: string;
  customerId: string;
  legacyInstanceId: string | null;
}

export class TenantAgentServiceError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "boolean");
}

function isToolApprovalLevel(v: unknown): v is ToolApprovalLevel {
  return v === "auto" || v === "confirm" || v === "disabled";
}

function parseToolApprovalOverrides(raw: unknown): Record<string, ToolApprovalLevel> {
  if (!isRecord(raw)) return {};
  const result: Record<string, ToolApprovalLevel> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (isToolApprovalLevel(val)) result[key] = val;
  }
  return result;
}

function parseTenantAgentConfig(config: unknown): TenantAgentConfig {
  if (!isRecord(config)) {
    return {
      personality_preset: "general",
      custom_personality: null,
      discord_channel_id: null,
      discord_channel_name: null,
      cron_jobs: {},
      composio_toolkits: [],
      goal: null,
      backstory: null,
      tool_approval_overrides: {},
    };
  }

  const personalityPreset = toPersonalityPreset(config["personality_preset"]);
  const customPersonality =
    typeof config["custom_personality"] === "string"
      ? config["custom_personality"]
      : null;
  const discordChannelId =
    typeof config["discord_channel_id"] === "string"
      ? config["discord_channel_id"]
      : null;
  const discordChannelName =
    typeof config["discord_channel_name"] === "string"
      ? config["discord_channel_name"]
      : null;
  const cronJobs = isBooleanRecord(config["cron_jobs"]) ? config["cron_jobs"] : {};
  const composioToolkits = Array.isArray(config["composio_toolkits"])
    ? (config["composio_toolkits"] as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const goal = typeof config["goal"] === "string" ? config["goal"] : null;
  const backstory = typeof config["backstory"] === "string" ? config["backstory"] : null;
  const toolApprovalOverrides = parseToolApprovalOverrides(config["tool_approval_overrides"]);

  return {
    personality_preset: personalityPreset,
    custom_personality: customPersonality,
    discord_channel_id: discordChannelId,
    discord_channel_name: discordChannelName,
    cron_jobs: cronJobs,
    composio_toolkits: composioToolkits,
    goal,
    backstory,
    tool_approval_overrides: toolApprovalOverrides,
  };
}

function buildTenantAgentConfig(
  currentConfig: unknown,
  patch: TenantAgentConfigPatch
): Record<string, unknown> {
  const current = parseTenantAgentConfig(currentConfig);

  return {
    personality_preset: patch.personality_preset ?? current.personality_preset,
    custom_personality:
      patch.custom_personality !== undefined
        ? patch.custom_personality
        : current.custom_personality,
    discord_channel_id:
      patch.discord_channel_id !== undefined
        ? patch.discord_channel_id
        : current.discord_channel_id,
    discord_channel_name:
      patch.discord_channel_name !== undefined
        ? patch.discord_channel_name
        : current.discord_channel_name,
    cron_jobs: patch.cron_jobs ?? current.cron_jobs,
    composio_toolkits: patch.composio_toolkits ?? current.composio_toolkits,
    goal: patch.goal !== undefined ? patch.goal : current.goal,
    backstory: patch.backstory !== undefined ? patch.backstory : current.backstory,
    tool_approval_overrides: patch.tool_approval_overrides ?? current.tool_approval_overrides,
  };
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return slug.length > 0 ? slug : "agent";
}

async function ensureTenantAgentsHydratedFromLegacy(
  admin: SupabaseClient,
  context: TenantAgentMutationContext
): Promise<void> {
  if (!context.legacyInstanceId) {
    return;
  }

  const { count: tenantAgentCount, error: countError } = await admin
    .from("tenant_agents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId)
    .neq("status", "archived");

  if (countError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(countError, "Failed to count tenant agents")
    );
  }

  if ((tenantAgentCount || 0) > 0) {
    return;
  }

  const { data: legacyAgents, error: legacyError } = await admin
    .from("agents")
    .select(LEGACY_AGENT_SELECT)
    .eq("instance_id", context.legacyInstanceId)
    .order("sort_order", { ascending: true });

  if (legacyError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(legacyError, "Failed to load legacy agents")
    );
  }

  const legacyRows = (legacyAgents || []) as LegacyAgentRow[];
  if (legacyRows.length === 0) {
    return;
  }

  const rowsToInsert = legacyRows.map((legacyAgent) => ({
    tenant_id: context.tenantId,
    customer_id: context.customerId,
    legacy_agent_id: legacyAgent.id,
    agent_key: legacyAgent.agent_key,
    display_name: legacyAgent.display_name,
    status: "active",
    policy_profile: "normal",
    is_default: legacyAgent.is_default,
    sort_order: legacyAgent.sort_order,
    skills: legacyAgent.skills,
    config: {
      personality_preset: legacyAgent.personality_preset,
      custom_personality: legacyAgent.custom_personality,
      discord_channel_id: legacyAgent.discord_channel_id,
      discord_channel_name: legacyAgent.discord_channel_name,
      cron_jobs: legacyAgent.cron_jobs || {},
    },
  }));

  const { error: insertError } = await admin.from("tenant_agents").insert(rowsToInsert);

  if (insertError && insertError.code !== "23505") {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(insertError, "Failed to hydrate tenant agents from legacy")
    );
  }
}

async function resolveUniqueTenantAgentKey(
  admin: SupabaseClient,
  tenantId: string,
  baseKey: string
): Promise<{ agentKey: string; existingCount: number }> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select("agent_key")
    .eq("tenant_id", tenantId)
    .like("agent_key", `${baseKey}%`);

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant agent key")
    );
  }

  const existingRows = (data || []) as Array<{ agent_key: string }>;
  const existingKeys = new Set(existingRows.map((row) => row.agent_key));
  if (!existingKeys.has(baseKey)) {
    return { agentKey: baseKey, existingCount: existingRows.length };
  }

  let suffix = 2;
  while (existingKeys.has(`${baseKey}-${suffix}`)) {
    suffix += 1;
  }

  return { agentKey: `${baseKey}-${suffix}`, existingCount: existingRows.length };
}

async function resolveUniqueLegacyAgentKey(
  admin: SupabaseClient,
  instanceId: string,
  baseKey: string
): Promise<{ agentKey: string; existingCount: number }> {
  const { data, error } = await admin
    .from("agents")
    .select("agent_key")
    .eq("instance_id", instanceId)
    .like("agent_key", `${baseKey}%`);

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve legacy agent key")
    );
  }

  const existingRows = (data || []) as Array<{ agent_key: string }>;
  const existingKeys = new Set(existingRows.map((row) => row.agent_key));
  if (!existingKeys.has(baseKey)) {
    return { agentKey: baseKey, existingCount: existingRows.length };
  }

  let suffix = 2;
  while (existingKeys.has(`${baseKey}-${suffix}`)) {
    suffix += 1;
  }

  return { agentKey: `${baseKey}-${suffix}`, existingCount: existingRows.length };
}

async function resolveNextTenantSortOrder(
  admin: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant agent sort order")
    );
  }

  const row = data as { sort_order?: number } | null;
  return typeof row?.sort_order === "number" ? row.sort_order + 1 : 0;
}

async function fetchTenantAgentByIdentifier(
  admin: SupabaseClient,
  tenantId: string,
  agentIdentifier: string
): Promise<TenantAgentRow | null> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select(TENANT_AGENT_SELECT)
    .eq("tenant_id", tenantId)
    .or(`id.eq.${agentIdentifier},legacy_agent_id.eq.${agentIdentifier}`)
    .maybeSingle();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant agent")
    );
  }

  return (data as TenantAgentRow | null) || null;
}

async function clearTenantDefaultAgent(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  const { error } = await admin
    .from("tenant_agents")
    .update({ is_default: false })
    .eq("tenant_id", tenantId)
    .eq("is_default", true);

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to clear tenant default agent")
    );
  }
}

async function clearLegacyDefaultAgent(
  admin: SupabaseClient,
  legacyInstanceId: string
): Promise<void> {
  const { error } = await admin.rpc("set_default_agent", {
    p_instance_id: legacyInstanceId,
    p_agent_id: "00000000-0000-0000-0000-000000000000",
  });

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to clear legacy default agent")
    );
  }
}

async function syncTenantAgentToLegacy(
  admin: SupabaseClient,
  context: TenantAgentMutationContext,
  tenantAgent: TenantAgentRow
): Promise<TenantAgentRow> {
  if (!context.legacyInstanceId) {
    return tenantAgent;
  }

  const config = parseTenantAgentConfig(tenantAgent.config);
  let legacyAgentId = tenantAgent.legacy_agent_id;

  if (legacyAgentId) {
    const { data: existingLegacy, error: existingError } = await admin
      .from("agents")
      .select("id, instance_id, is_default")
      .eq("id", legacyAgentId)
      .eq("instance_id", context.legacyInstanceId)
      .maybeSingle();

    if (existingError) {
      throw new TenantAgentServiceError(
        500,
        safeErrorMessage(existingError, "Failed to resolve legacy agent for sync")
      );
    }

    if (existingLegacy) {
      if (tenantAgent.is_default && !existingLegacy.is_default) {
        await clearLegacyDefaultAgent(admin, context.legacyInstanceId);
      }

      const { error: updateLegacyError } = await admin
        .from("agents")
        .update({
          agent_key: tenantAgent.agent_key,
          display_name: tenantAgent.display_name,
          personality_preset: config.personality_preset,
          custom_personality: config.custom_personality,
          discord_channel_id: config.discord_channel_id,
          discord_channel_name: config.discord_channel_name,
          is_default: tenantAgent.is_default,
          skills: tenantAgent.skills,
          cron_jobs: config.cron_jobs,
          sort_order: tenantAgent.sort_order,
        })
        .eq("id", existingLegacy.id);

      if (updateLegacyError) {
        throw new TenantAgentServiceError(
          500,
          safeErrorMessage(updateLegacyError, "Failed to update legacy agent from tenant state")
        );
      }

      return tenantAgent;
    }

    legacyAgentId = null;
  }

  const { agentKey } = await resolveUniqueLegacyAgentKey(
    admin,
    context.legacyInstanceId,
    tenantAgent.agent_key
  );

  if (tenantAgent.is_default) {
    await clearLegacyDefaultAgent(admin, context.legacyInstanceId);
  }

  const { data: insertedLegacy, error: insertLegacyError } = await admin
    .from("agents")
    .insert({
      instance_id: context.legacyInstanceId,
      customer_id: context.customerId,
      agent_key: agentKey,
      display_name: tenantAgent.display_name,
      personality_preset: config.personality_preset,
      custom_personality: config.custom_personality,
      discord_channel_id: config.discord_channel_id,
      discord_channel_name: config.discord_channel_name,
      is_default: tenantAgent.is_default,
      skills: tenantAgent.skills,
      cron_jobs: config.cron_jobs,
      sort_order: tenantAgent.sort_order,
    })
    .select("id")
    .single();

  if (insertLegacyError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(insertLegacyError, "Failed to create legacy agent from tenant state")
    );
  }

  const legacyId = (insertedLegacy as { id: string }).id;
  const updateTenantPayload: Record<string, unknown> = { legacy_agent_id: legacyId };
  if (agentKey !== tenantAgent.agent_key) {
    updateTenantPayload["agent_key"] = agentKey;
  }

  const { data: updatedTenant, error: updateTenantError } = await admin
    .from("tenant_agents")
    .update(updateTenantPayload)
    .eq("id", tenantAgent.id)
    .select(TENANT_AGENT_SELECT)
    .single();

  if (updateTenantError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(updateTenantError, "Failed to update tenant agent legacy linkage")
    );
  }

  return updatedTenant as TenantAgentRow;
}

async function promoteNextTenantDefaultAgent(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  const { data: nextTenantAgent, error } = await admin
    .from("tenant_agents")
    .select("id")
    .eq("tenant_id", tenantId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve next tenant default agent")
    );
  }

  const next = nextTenantAgent as { id?: string } | null;
  if (!next?.id) {
    return;
  }

  const { error: setDefaultError } = await admin
    .from("tenant_agents")
    .update({ is_default: true })
    .eq("id", next.id);

  if (setDefaultError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(setDefaultError, "Failed to promote next tenant default agent")
    );
  }
}

async function promoteNextLegacyDefaultAgent(
  admin: SupabaseClient,
  legacyInstanceId: string
): Promise<void> {
  const { data: nextLegacyAgent, error } = await admin
    .from("agents")
    .select("id")
    .eq("instance_id", legacyInstanceId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve next legacy default agent")
    );
  }

  const next = nextLegacyAgent as { id?: string } | null;
  if (!next?.id) {
    return;
  }

  const { error: updateError } = await admin
    .from("agents")
    .update({ is_default: true })
    .eq("id", next.id);

  if (updateError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(updateError, "Failed to promote next legacy default agent")
    );
  }
}

function mapTenantAgentRow(row: TenantAgentRow): TenantRuntimeAgent {
  const config = parseTenantAgentConfig(row.config);

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    legacy_agent_id: row.legacy_agent_id,
    agent_key: row.agent_key,
    display_name: row.display_name,
    personality_preset: config.personality_preset,
    custom_personality: config.custom_personality,
    discord_channel_id: config.discord_channel_id,
    discord_channel_name: config.discord_channel_name,
    is_default: row.is_default,
    skills: row.skills,
    cron_jobs: config.cron_jobs,
    composio_toolkits: config.composio_toolkits,
    goal: config.goal,
    backstory: config.backstory,
    tool_approval_overrides: config.tool_approval_overrides,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}


export async function resolveTenantIdForInstance(
  admin: SupabaseClient,
  instanceId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("instance_tenant_mappings")
    .select("tenant_id")
    .eq("instance_id", instanceId)
    .eq("mapping_status", "active")
    .maybeSingle();

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant mapping for instance")
    );
  }

  const mapping = data as { tenant_id?: string } | null;
  return mapping?.tenant_id || null;
}

export async function resolveCanonicalLegacyInstanceForTenant(
  admin: SupabaseClient,
  tenantId: string
): Promise<{ instanceId: string | null; ambiguous: boolean }> {
  const { data, error } = await admin
    .from("instance_tenant_mappings")
    .select("instance_id")
    .eq("tenant_id", tenantId)
    .eq("mapping_status", "active")
    .order("updated_at", { ascending: false })
    .limit(2);

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to resolve legacy instance mapping for tenant")
    );
  }

  const mappings = (data || []) as TenantInstanceMappingRow[];
  if (mappings.length === 0) {
    return { instanceId: null, ambiguous: false };
  }

  return {
    instanceId: mappings[0].instance_id,
    ambiguous: mappings.length > 1,
  };
}

export async function listTenantRuntimeAgents(
  admin: SupabaseClient,
  context: TenantAgentMutationContext
): Promise<TenantRuntimeAgent[]> {
  await ensureTenantAgentsHydratedFromLegacy(admin, context);

  const { data, error } = await admin
    .from("tenant_agents")
    .select(TENANT_AGENT_SELECT)
    .eq("tenant_id", context.tenantId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(error, "Failed to list tenant agents")
    );
  }

  return ((data || []) as TenantAgentRow[]).map(mapTenantAgentRow);
}

export async function createTenantRuntimeAgent(
  admin: SupabaseClient,
  context: TenantAgentMutationContext,
  data: CreateAgentData
): Promise<TenantRuntimeAgent> {
  await ensureTenantAgentsHydratedFromLegacy(admin, context);

  const baseKey = slugify(data.display_name);
  const { agentKey, existingCount } = await resolveUniqueTenantAgentKey(
    admin,
    context.tenantId,
    baseKey
  );
  const isFirstAgent = existingCount === 0;
  const shouldBeDefault = data.is_default || isFirstAgent;
  const sortOrder = await resolveNextTenantSortOrder(admin, context.tenantId);

  if (shouldBeDefault) {
    await clearTenantDefaultAgent(admin, context.tenantId);
  }

  const tenantConfig = buildTenantAgentConfig({}, {
    personality_preset: data.personality_preset,
    custom_personality: data.custom_personality || null,
    discord_channel_id: data.discord_channel_id || null,
    discord_channel_name: data.discord_channel_name || null,
    cron_jobs: data.cron_jobs,
    composio_toolkits: data.composio_toolkits || [],
    goal: data.goal || null,
    backstory: data.backstory || null,
    tool_approval_overrides: data.tool_approval_overrides || {},
  });

  const { data: insertedTenant, error: insertTenantError } = await admin
    .from("tenant_agents")
    .insert({
      tenant_id: context.tenantId,
      customer_id: context.customerId,
      agent_key: agentKey,
      display_name: data.display_name,
      status: "active",
      policy_profile: "normal",
      is_default: shouldBeDefault,
      sort_order: sortOrder,
      skills: data.skills,
      config: tenantConfig,
    })
    .select(TENANT_AGENT_SELECT)
    .single();

  if (insertTenantError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(insertTenantError, "Failed to create tenant agent")
    );
  }

  let tenantRow = insertedTenant as TenantAgentRow;

  try {
    tenantRow = await syncTenantAgentToLegacy(admin, context, tenantRow);
  } catch (error) {
    await admin.from("tenant_agents").delete().eq("id", tenantRow.id);
    throw error;
  }

  const mapped = mapTenantAgentRow(tenantRow);

  // Fire-and-forget: sync predefined cron toggles → scheduled_messages table
  if (data.cron_jobs && Object.keys(data.cron_jobs).length > 0) {
    syncPredefinedSchedulesToTable(
      admin,
      context.tenantId,
      context.customerId,
      mapped.id,
      mapped.discord_channel_id,
      data.cron_jobs
    ).catch((err) => {
      console.error("[create-agent] Schedule sync failed:", safeErrorMessage(err));
    });
  }

  return mapped;
}

export async function updateTenantRuntimeAgent(
  admin: SupabaseClient,
  context: TenantAgentMutationContext,
  agentIdentifier: string,
  data: UpdateAgentData
): Promise<TenantRuntimeAgent> {
  await ensureTenantAgentsHydratedFromLegacy(admin, context);

  const existingTenant = await fetchTenantAgentByIdentifier(
    admin,
    context.tenantId,
    agentIdentifier
  );

  if (!existingTenant) {
    throw new TenantAgentServiceError(404, "Agent not found");
  }

  if (data.is_default === true && !existingTenant.is_default) {
    await clearTenantDefaultAgent(admin, context.tenantId);

    const { error: setDefaultError } = await admin
      .from("tenant_agents")
      .update({ is_default: true })
      .eq("id", existingTenant.id);

    if (setDefaultError) {
      throw new TenantAgentServiceError(
        500,
        safeErrorMessage(setDefaultError, "Failed to set tenant default agent")
      );
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.display_name !== undefined) {
    updatePayload["display_name"] = data.display_name;
  }
  if (data.skills !== undefined) {
    updatePayload["skills"] = data.skills;
  }

  const configPatch: TenantAgentConfigPatch = {};
  if (data.personality_preset !== undefined) {
    configPatch.personality_preset = data.personality_preset;
  }
  if (data.custom_personality !== undefined) {
    configPatch.custom_personality = data.custom_personality || null;
  }
  if (data.discord_channel_id !== undefined) {
    configPatch.discord_channel_id = data.discord_channel_id || null;
  }
  if (data.discord_channel_name !== undefined) {
    configPatch.discord_channel_name = data.discord_channel_name || null;
  }
  if (data.cron_jobs !== undefined) {
    configPatch.cron_jobs = data.cron_jobs;
  }
  if (data.composio_toolkits !== undefined) {
    configPatch.composio_toolkits = data.composio_toolkits;
  }
  if (data.goal !== undefined) {
    configPatch.goal = data.goal || null;
  }
  if (data.backstory !== undefined) {
    configPatch.backstory = data.backstory || null;
  }
  if (data.tool_approval_overrides !== undefined) {
    configPatch.tool_approval_overrides = data.tool_approval_overrides;
  }

  if (Object.keys(configPatch).length > 0) {
    updatePayload["config"] = buildTenantAgentConfig(existingTenant.config, configPatch);
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await admin
      .from("tenant_agents")
      .update(updatePayload)
      .eq("id", existingTenant.id);

    if (updateError) {
      throw new TenantAgentServiceError(
        500,
        safeErrorMessage(updateError, "Failed to update tenant agent")
      );
    }
  }

  const { data: refreshedTenant, error: refreshError } = await admin
    .from("tenant_agents")
    .select(TENANT_AGENT_SELECT)
    .eq("id", existingTenant.id)
    .single();

  if (refreshError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(refreshError, "Failed to load updated tenant agent")
    );
  }

  const synced = await syncTenantAgentToLegacy(
    admin,
    context,
    refreshedTenant as TenantAgentRow
  );

  const mappedUpdated = mapTenantAgentRow(synced);

  // Fire-and-forget: sync predefined cron toggles → scheduled_messages table
  if (data.cron_jobs !== undefined) {
    syncPredefinedSchedulesToTable(
      admin,
      context.tenantId,
      context.customerId,
      mappedUpdated.id,
      mappedUpdated.discord_channel_id,
      mappedUpdated.cron_jobs
    ).catch((err) => {
      console.error("[update-agent] Schedule sync failed:", safeErrorMessage(err));
    });
  }

  return mappedUpdated;
}

export async function deleteTenantRuntimeAgent(
  admin: SupabaseClient,
  context: TenantAgentMutationContext,
  agentIdentifier: string
): Promise<void> {
  await ensureTenantAgentsHydratedFromLegacy(admin, context);

  const existingTenant = await fetchTenantAgentByIdentifier(
    admin,
    context.tenantId,
    agentIdentifier
  );

  if (!existingTenant) {
    throw new TenantAgentServiceError(404, "Agent not found");
  }

  const { count, error: countError } = await admin
    .from("tenant_agents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId)
    .neq("status", "archived");

  if (countError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(countError, "Failed to count tenant agents")
    );
  }

  if ((count || 0) <= 1) {
    throw new TenantAgentServiceError(400, "Cannot delete the last agent");
  }

  const { error: deleteTenantError } = await admin
    .from("tenant_agents")
    .delete()
    .eq("id", existingTenant.id);

  if (deleteTenantError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(deleteTenantError, "Failed to delete tenant agent")
    );
  }

  if (existingTenant.is_default) {
    await promoteNextTenantDefaultAgent(admin, context.tenantId);
  }

  if (!context.legacyInstanceId || !existingTenant.legacy_agent_id) {
    return;
  }

  const { data: existingLegacy, error: legacyLookupError } = await admin
    .from("agents")
    .select("id, is_default")
    .eq("id", existingTenant.legacy_agent_id)
    .eq("instance_id", context.legacyInstanceId)
    .maybeSingle();

  if (legacyLookupError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(legacyLookupError, "Failed to resolve legacy agent for delete")
    );
  }

  if (!existingLegacy) {
    return;
  }

  const { error: deleteLegacyError } = await admin
    .from("agents")
    .delete()
    .eq("id", existingLegacy.id);

  if (deleteLegacyError) {
    throw new TenantAgentServiceError(
      500,
      safeErrorMessage(deleteLegacyError, "Failed to delete legacy agent")
    );
  }

  if (existingLegacy.is_default) {
    await promoteNextLegacyDefaultAgent(admin, context.legacyInstanceId);
  }
}

export function buildTenantAgentContext(
  tenantId: string,
  customerId: string,
  legacyInstanceId: string | null
): TenantAgentMutationContext {
  return {
    tenantId,
    customerId,
    legacyInstanceId,
  };
}
