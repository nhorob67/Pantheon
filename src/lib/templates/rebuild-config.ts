import { createAdminClient } from "@/lib/supabase/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import {
  buildOpenClawConfig,
  buildMultiAgentOpenClawConfig,
  encodeConfigForEnv,
  type CustomSkillEntry,
  type RemoteMcpServerEntry,
} from "./openclaw-config";
import { renderSoulTemplate } from "./soul";
import { renderSoulPreset } from "./soul-presets";
import type { Agent } from "@/types/agent";
import type { FarmProfile, McpServerConfig } from "@/types/database";
import { getDiscordTokenFromChannelConfig } from "@/lib/channel-token";
import { decrypt } from "@/lib/crypto";
import { DEFAULT_MEMORY_SETTINGS } from "@/types/memory";
import { buildKnowledgePayload } from "@/lib/knowledge/payload";
import { compilePublishedWorkflowPack } from "@/lib/workflows/compiler";
import type { WorkflowGraph } from "@/types/workflow";

function getGatewayPasswordFromChannelConfig(channelConfig: unknown): string | undefined {
  const config = (channelConfig ?? {}) as { gateway_password_encrypted?: unknown };
  if (
    typeof config.gateway_password_encrypted === "string" &&
    config.gateway_password_encrypted.length > 0
  ) {
    try {
      return decrypt(config.gateway_password_encrypted);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeWorkflowGraph(value: unknown): WorkflowGraph {
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { nodes?: unknown }).nodes) &&
    Array.isArray((value as { edges?: unknown }).edges)
  ) {
    return value as WorkflowGraph;
  }

  return {
    nodes: [],
    edges: [],
  };
}

export async function rebuildAndDeploy(instanceId: string): Promise<void> {
  const admin = createAdminClient();

  // Fetch instance first — its customer_id is needed by subsequent queries
  const { data: instance } = await admin
    .from("instances")
    .select("id, customer_id, coolify_uuid, channel_config, channel_type, status, webhook_secret_encrypted")
    .eq("id", instanceId)
    .single();

  if (!instance || !instance.coolify_uuid) {
    throw new Error("Instance not found or no container");
  }

  // Fetch all remaining data in parallel — none of these depend on each other
  const [
    { data: profile },
    { data: agents },
    { data: skillConfigs },
    { data: mcpConfigs },
    { data: memorySettings },
    { data: customSkillRows },
    { data: knowledgeFiles },
    { data: publishedWorkflowDefs },
    { data: alertPrefs },
    { data: composioConfig },
  ] = await Promise.all([
    admin
      .from("farm_profiles")
      .select("id, customer_id, farm_name, state, county, primary_crops, acres, elevators, elevator_urls, weather_location, weather_lat, weather_lng, timezone")
      .eq("customer_id", instance.customer_id)
      .single(),
    admin
      .from("agents")
      .select("id, instance_id, customer_id, agent_key, display_name, personality_preset, custom_personality, discord_channel_id, discord_channel_name, is_default, skills, cron_jobs, sort_order")
      .eq("instance_id", instanceId)
      .order("sort_order", { ascending: true }),
    admin
      .from("skill_configs")
      .select("skill_name, enabled")
      .eq("customer_id", instance.customer_id),
    admin
      .from("mcp_server_configs")
      .select("id, instance_id, customer_id, server_key, display_name, command, args, env, env_vars, scope, agent_id, enabled, created_at, updated_at")
      .eq("instance_id", instanceId)
      .eq("enabled", true),
    admin
      .from("instance_memory_settings")
      .select("mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress")
      .eq("instance_id", instanceId)
      .maybeSingle(),
    admin
      .from("custom_skills")
      .select("slug, skill_md, references, config")
      .eq("customer_id", instance.customer_id)
      .eq("status", "active"),
    admin
      .from("knowledge_files")
      .select("id, agent_id, file_name, parsed_markdown")
      .eq("instance_id", instanceId)
      .eq("status", "active"),
    admin
      .from("workflow_definitions")
      .select("id, name, published_version, draft_graph")
      .eq("instance_id", instanceId)
      .eq("customer_id", instance.customer_id)
      .eq("status", "published")
      .not("published_version", "is", null),
    admin
      .from("alert_preferences")
      .select("*")
      .eq("customer_id", instance.customer_id)
      .maybeSingle(),
    admin
      .from("composio_configs")
      .select("*")
      .eq("instance_id", instanceId)
      .eq("enabled", true)
      .maybeSingle(),
  ]);

  if (!profile) {
    throw new Error("Farm profile not found");
  }

  const customSkills: CustomSkillEntry[] = (customSkillRows || []).map((cs) => ({
    slug: cs.slug,
    skill_md: cs.skill_md,
    references: cs.references as Record<string, string>,
    config: cs.config as Record<string, unknown>,
  }));

  // Fetch published workflow version snapshots (depends on workflowDefs result)
  let publishedWorkflowVersions: Array<{
    workflow_id: string;
    version: number;
    graph: unknown;
  }> = [];
  if ((publishedWorkflowDefs?.length || 0) > 0) {
    const workflowIds = (publishedWorkflowDefs || []).map((workflow) => workflow.id);
    const publishedVersions = (publishedWorkflowDefs || []).map(
      (workflow) => workflow.published_version as number
    );

    const { data: versionRows } = await admin
      .from("workflow_versions")
      .select("workflow_id, version, graph")
      .eq("instance_id", instanceId)
      .eq("customer_id", instance.customer_id)
      .in("workflow_id", workflowIds)
      .in("version", publishedVersions);

    publishedWorkflowVersions = (versionRows || []) as Array<{
      workflow_id: string;
      version: number;
      graph: unknown;
    }>;
  }

  const remoteMcpServers: RemoteMcpServerEntry[] = [];
  if (composioConfig?.mcp_server_url) {
    remoteMcpServers.push({
      key: "composio",
      definition: {
        url: composioConfig.mcp_server_url,
        transport: "sse" as const,
      },
    });
  }

  const typedMcpConfigs = (mcpConfigs || []) as McpServerConfig[];
  const effectiveMemorySettings = memorySettings || DEFAULT_MEMORY_SETTINGS;

  const channelToken = getDiscordTokenFromChannelConfig(instance.channel_config);
  const gatewayPassword = getGatewayPasswordFromChannelConfig(instance.channel_config);

  const envVars: Record<string, string> = {};
  envVars.FARMCLAW_MEMORY_MODE = effectiveMemorySettings.mode;
  envVars.FARMCLAW_MEMORY_CAPTURE_LEVEL = effectiveMemorySettings.capture_level;
  envVars.FARMCLAW_MEMORY_RETENTION_DAYS = String(
    effectiveMemorySettings.retention_days
  );
  envVars.FARMCLAW_MEMORY_EXCLUDE_CATEGORIES = JSON.stringify(
    effectiveMemorySettings.exclude_categories
  );
  envVars.FARMCLAW_MEMORY_AUTO_CHECKPOINT = String(
    effectiveMemorySettings.auto_checkpoint
  );
  envVars.FARMCLAW_MEMORY_AUTO_COMPRESS = String(
    effectiveMemorySettings.auto_compress
  );
  envVars.FARMCLAW_VAULT_PATH = "/home/node/.openclaw/vault";

  const publishedGraphByVersion = new Map<string, unknown>(
    publishedWorkflowVersions.map((row) => [
      `${row.workflow_id}:${row.version}`,
      row.graph,
    ])
  );

  const compileInputs = (publishedWorkflowDefs || []).map((workflow) => {
    const publishedVersion = workflow.published_version as number;
    const graphFromVersion = publishedGraphByVersion.get(
      `${workflow.id}:${publishedVersion}`
    );

    return {
      workflow_id: workflow.id,
      version: publishedVersion,
      name: workflow.name,
      graph: normalizeWorkflowGraph(graphFromVersion ?? workflow.draft_graph),
      missing_published_snapshot: graphFromVersion === undefined,
    };
  });

  const workflowCompilerOutput = compilePublishedWorkflowPack(
    compileInputs.map((input) => ({
      workflow_id: input.workflow_id,
      version: input.version,
      name: input.name,
      graph: input.graph,
    }))
  );

  for (const input of compileInputs) {
    if (input.missing_published_snapshot) {
      workflowCompilerOutput.compile_errors.push({
        workflow_id: input.workflow_id,
        code: "SCHEMA_INVALID",
        message:
          "Published version snapshot missing; compiler used current draft graph fallback.",
      });
    }
  }

  envVars.FARMCLAW_WORKFLOW_IR = Buffer.from(
    JSON.stringify(workflowCompilerOutput)
  ).toString("base64");
  envVars.FARMCLAW_WORKFLOW_IR_COUNT = String(
    workflowCompilerOutput.workflows.length
  );

  if (agents && agents.length > 0) {
    // Multi-agent mode
    const typedAgents = agents as Agent[];

    // Intersect per-agent skills with global skill configs
    const globalSkillStates = new Map(
      (skillConfigs || []).map((s) => [s.skill_name, s.enabled])
    );

    const effectiveAgents = typedAgents.map((agent) => ({
      ...agent,
      skills: agent.skills.filter((skill) => {
        const globalEnabled = globalSkillStates.get(skill);
        return globalEnabled !== false; // enabled if no config or explicitly enabled
      }),
    }));

    const hasKnowledgeFiles = (knowledgeFiles?.length ?? 0) > 0;
    const openclawConfig = buildMultiAgentOpenClawConfig(
      profile as FarmProfile,
      { type: "discord", token: channelToken },
      process.env.OPENROUTER_API_KEY!,
      effectiveAgents,
      skillConfigs || [],
      gatewayPassword,
      typedMcpConfigs,
      customSkills,
      remoteMcpServers,
      hasKnowledgeFiles,
      alertPrefs
    );

    envVars.OPENCLAW_CONFIG = encodeConfigForEnv(openclawConfig);

    // Build per-agent SOUL files
    const soulFiles: Record<string, string> = {};
    for (const agent of effectiveAgents) {
      soulFiles[agent.agent_key] = renderSoulPreset(
        agent.personality_preset,
        {
          farm_name: profile.farm_name || "My Farm",
          agent_name: agent.display_name,
          state: profile.state,
          county: profile.county || "",
          acres: profile.acres || 0,
          crops_list: profile.primary_crops.join(", "),
          elevator_names: profile.elevators.join(", "),
          timezone: profile.timezone,
        },
        agent.custom_personality
      );
    }

    envVars.SOUL_FILES = Buffer.from(JSON.stringify(soulFiles)).toString(
      "base64"
    );

    // Also set SOUL_MD from the default agent for backward compat
    const defaultAgent = effectiveAgents.find((a) => a.is_default);
    if (defaultAgent) {
      envVars.SOUL_MD = Buffer.from(
        soulFiles[defaultAgent.agent_key]
      ).toString("base64");
    }
  } else {
    // Legacy single-agent mode
    const hasKnowledgeFiles = (knowledgeFiles?.length ?? 0) > 0;
    const openclawConfig = buildOpenClawConfig(
      profile as FarmProfile,
      { type: "discord", token: channelToken },
      process.env.OPENROUTER_API_KEY!,
      skillConfigs || [],
      gatewayPassword,
      typedMcpConfigs,
      customSkills,
      remoteMcpServers,
      hasKnowledgeFiles,
      alertPrefs
    );

    envVars.OPENCLAW_CONFIG = encodeConfigForEnv(openclawConfig);

    envVars.SOUL_MD = Buffer.from(
      renderSoulTemplate({
        farm_name: profile.farm_name || "My Farm",
        state: profile.state,
        county: profile.county || "",
        acres: profile.acres || 0,
        crops_list: profile.primary_crops.join(", "),
        elevator_names: profile.elevators.join(", "),
        timezone: profile.timezone,
      })
    ).toString("base64");
  }

  // Encode custom skills for container
  if (customSkills.length > 0) {
    const skillData: Record<string, { skill_md: string; references: Record<string, string> }> = {};
    for (const cs of customSkills) {
      skillData[cs.slug] = {
        skill_md: cs.skill_md,
        references: cs.references,
      };
    }
    envVars.CUSTOM_SKILLS = Buffer.from(JSON.stringify(skillData)).toString("base64");
  }

  // Encode knowledge files for container
  if (knowledgeFiles && knowledgeFiles.length > 0) {
    const knowledgeData = buildKnowledgePayload(knowledgeFiles, (agents as Agent[]) || []);
    envVars.KNOWLEDGE_FILES = Buffer.from(JSON.stringify(knowledgeData)).toString("base64");
  }

  // Include webhook env vars if configured
  if (instance.webhook_secret_encrypted) {
    try {
      const webhookSecret = decrypt(instance.webhook_secret_encrypted);
      envVars.FARMCLAW_WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/openclaw`;
      envVars.FARMCLAW_WEBHOOK_SECRET = webhookSecret;
      envVars.FARMCLAW_INSTANCE_ID = instanceId;
    } catch {
      // Skip webhook vars if decryption fails
    }
  }

  // Push to Coolify and restart
  const coolify = getCoolifyClient();
  await coolify.updateEnvVars(instance.coolify_uuid, envVars);
  await coolify.restartApplication(instance.coolify_uuid);
}
