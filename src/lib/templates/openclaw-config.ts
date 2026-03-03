import type { FarmProfile } from "@/types/database";
import type { Agent } from "@/types/agent";
import { CRON_JOB_INFO } from "@/types/agent";
import type { AlertPreferences } from "@/types/alerts";
import type {
  McpServerConfig,
  McpServerDefinition,
  RemoteMcpServerDefinition,
  McpServerEntry,
} from "@/types/mcp";

interface ChannelConfig {
  type: "discord";
  token: string;
}

interface SkillConfigEntry {
  skill_name: string;
  enabled: boolean;
}

export interface CustomSkillEntry {
  slug: string;
  skill_md: string;
  references: Record<string, string>;
  config: Record<string, unknown>;
}

export interface RemoteMcpServerEntry {
  key: string;
  definition: RemoteMcpServerDefinition;
}

const ALERT_CRON_MESSAGES = {
  "weather-alert-check":
    "Check the NWS alerts API for my farm's coordinates. If there are any active weather alerts with severity Moderate or higher, summarize them and alert me. If there are no severe alerts, do NOT send any message.",
  "price-alert-check": (thresholdCents: number) =>
    `Run the grain bids skill and compare current cash bids to the last known prices in memory (keys like last_bids:elevator:crop). If any crop's price has moved more than ${thresholdCents} cents per bushel, alert me with the details. Store the new prices in memory for next time. If no significant changes, do NOT send any message.`,
  "ticket-anomaly-check":
    "Use the tenant_scale_ticket_query tool to query today's scale tickets. Check for anomalies: net weight more than 2 standard deviations from the 30-day average for that crop, moisture outside normal range, or duplicate tickets (same elevator, crop, and similar weight on the same day). If anomalies found, summarize them. If everything looks normal, do NOT send any message.",
} as const;

function buildAlertCronEntries(
  alertPrefs: AlertPreferences | null,
  timezone: string,
  weatherEnabled: boolean,
  grainBidsEnabled: boolean,
  scaleTicketsEnabled: boolean,
  agentId?: string
): Record<string, unknown> {
  if (!alertPrefs) return {};

  const entries: Record<string, unknown> = {};

  if (alertPrefs.weather_severe_enabled && weatherEnabled) {
    const key = agentId ? `weather-alert-check-${agentId}` : "weather-alert-check";
    entries[key] = {
      schedule: CRON_JOB_INFO["weather-alert-check"].schedule,
      timezone,
      ...(agentId ? { agentId } : {}),
      message: ALERT_CRON_MESSAGES["weather-alert-check"],
    };
  }

  if (alertPrefs.price_movement_enabled && grainBidsEnabled) {
    const key = agentId ? `price-alert-check-${agentId}` : "price-alert-check";
    entries[key] = {
      schedule: CRON_JOB_INFO["price-alert-check"].schedule,
      timezone,
      ...(agentId ? { agentId } : {}),
      message: ALERT_CRON_MESSAGES["price-alert-check"](
        alertPrefs.price_movement_threshold_cents
      ),
    };
  }

  if (alertPrefs.ticket_anomaly_enabled && scaleTicketsEnabled) {
    const key = agentId ? `ticket-anomaly-check-${agentId}` : "ticket-anomaly-check";
    entries[key] = {
      schedule: CRON_JOB_INFO["ticket-anomaly-check"].schedule,
      timezone,
      ...(agentId ? { agentId } : {}),
      message: ALERT_CRON_MESSAGES["ticket-anomaly-check"],
    };
  }

  return entries;
}

function buildMcpServersBlock(
  configs: McpServerConfig[],
  remoteMcpServers: RemoteMcpServerEntry[] = []
): Record<string, McpServerEntry> | undefined {
  const enabled = configs.filter((c) => c.enabled);
  if (enabled.length === 0 && remoteMcpServers.length === 0) return undefined;

  const block: Record<string, McpServerEntry> = {};
  for (const config of enabled) {
    const entry: McpServerDefinition = {
      command: config.command,
      args: config.args,
    };
    if (Object.keys(config.env_vars).length > 0) {
      entry.env = config.env_vars;
    }
    block[config.server_key] = entry;
  }
  for (const remote of remoteMcpServers) {
    block[remote.key] = remote.definition;
  }
  return block;
}

export function buildOpenClawConfig(
  profile: FarmProfile,
  channel: ChannelConfig,
  openrouterApiKey: string,
  skillConfigs: SkillConfigEntry[] = [],
  gatewayPassword?: string,
  mcpConfigs: McpServerConfig[] = [],
  customSkills: CustomSkillEntry[] = [],
  remoteMcpServers: RemoteMcpServerEntry[] = [],
  hasKnowledgeFiles: boolean = false,
  alertPrefs: AlertPreferences | null = null
) {
  const isSkillEnabled = (name: string) => {
    const entry = skillConfigs.find((s) => s.skill_name === name);
    return entry ? entry.enabled : true; // default enabled if no config
  };

  const grainBidsEnabled = isSkillEnabled("farm-grain-bids");
  const weatherEnabled = isSkillEnabled("farm-weather");
  const scaleTicketsEnabled = isSkillEnabled("farm-scale-tickets");

  const cron: Record<string, unknown> = {};
  if (weatherEnabled) {
    cron["morning-weather"] = {
      schedule: "0 6 * * *",
      timezone: profile.timezone,
      message:
        "Run the morning weather summary skill and send me today's weather briefing.",
    };
  }
  if (grainBidsEnabled) {
    cron["daily-grain-bids"] = {
      schedule: "0 9 * * 1-5",
      timezone: profile.timezone,
      message:
        "Run the grain bids skill and send me today's cash bids from my configured elevators.",
    };
  }

  // Inject alert cron entries from preferences
  const alertCrons = buildAlertCronEntries(
    alertPrefs, profile.timezone, weatherEnabled, grainBidsEnabled, scaleTicketsEnabled
  );
  Object.assign(cron, alertCrons);

  const mcpServers = buildMcpServersBlock(mcpConfigs, remoteMcpServers);

  const config: Record<string, unknown> = {
    name: "FarmClaw",
    version: "1.0.0",

    providers: {
      openrouter: {
        apiKey: openrouterApiKey,
        default: true,
      },
    },

    models: {
      default: "anthropic/claude-sonnet-4-5",
      thinking: "anthropic/claude-sonnet-4-5",
    },

    channels: {
      discord: {
        enabled: true,
        token: channel.token,
        dm: { policy: "owner" },
        configWrites: false,
      },
    },

    tools: {
      allow: [
        "read", "write", "edit", "exec", "web_search", "web_fetch", "browser",
        "message", "memory_read", "memory_write",
        "sessions_list", "sessions_history", "session_status",
        "image",
      ],
      deny: ["apply_patch", "process"],
      elevated: { enabled: false },
    },

    browser: {
      enabled: true,
      headless: true,
    },

    gateway: {
      ...(gatewayPassword ? { auth: { password: gatewayPassword } } : {}),
      bind: "127.0.0.1",
    },

    skills: {
      install: { nodeManager: "npm" },
      entries: {
        "farm-grain-bids": {
          enabled: grainBidsEnabled,
          config: {
            elevators: profile.elevator_urls,
            crops: profile.primary_crops,
          },
        },
        "farm-weather": {
          enabled: weatherEnabled,
          config: {
            latitude: profile.weather_lat,
            longitude: profile.weather_lng,
            location_name: profile.weather_location,
            timezone: profile.timezone,
          },
        },
        "farm-scale-tickets": {
          enabled: scaleTicketsEnabled,
          config: {
            crops: profile.primary_crops,
            elevators: profile.elevators,
          },
        },
        ...Object.fromEntries(
          customSkills.map((cs) => [
            cs.slug,
            { enabled: true, config: cs.config },
          ])
        ),
      },
    },

    ...(mcpServers ? { mcpServers } : {}),

    cron,

    // Native OpenClaw memory remains enabled in all modes.
    // Hybrid local-vault behavior is controlled via runtime env vars.
    memory: {
      enabled: true,
      ...(hasKnowledgeFiles
        ? { memorySearch: { extraPaths: ["/home/node/knowledge"] } }
        : {}),
    },
  };

  return config;
}

export function buildMultiAgentOpenClawConfig(
  profile: FarmProfile,
  channel: ChannelConfig,
  openrouterApiKey: string,
  agents: Agent[],
  skillConfigs: SkillConfigEntry[] = [],
  gatewayPassword?: string,
  mcpConfigs: McpServerConfig[] = [],
  customSkills: CustomSkillEntry[] = [],
  remoteMcpServers: RemoteMcpServerEntry[] = [],
  hasKnowledgeFiles: boolean = false,
  alertPrefs: AlertPreferences | null = null
) {
  const isSkillGloballyEnabled = (name: string) => {
    const entry = skillConfigs.find((s) => s.skill_name === name);
    return entry ? entry.enabled : true;
  };

  // Union all agent skills into a shared skill set
  const allSkills = new Set<string>();
  for (const agent of agents) {
    for (const skill of agent.skills) {
      if (isSkillGloballyEnabled(skill)) {
        allSkills.add(skill);
      }
    }
  }

  const grainBidsEnabled = allSkills.has("farm-grain-bids");
  const weatherEnabled = allSkills.has("farm-weather");
  const scaleTicketsEnabled = allSkills.has("farm-scale-tickets");

  const mcpServers = buildMcpServersBlock(mcpConfigs, remoteMcpServers);

  // Build per-agent cron entries
  const cron: Record<string, unknown> = {};
  for (const agent of agents) {
    const agentCrons = agent.cron_jobs || {};
    for (const [cronName, enabled] of Object.entries(agentCrons)) {
      if (!enabled) continue;
      const cronInfo = CRON_JOB_INFO[cronName as keyof typeof CRON_JOB_INFO];
      if (!cronInfo) continue;
      // Check if the required skill is active for this agent
      if (!agent.skills.includes(cronInfo.requiredSkill)) continue;
      if (!isSkillGloballyEnabled(cronInfo.requiredSkill)) continue;

      const key = `${cronName}-${agent.agent_key}`;
      cron[key] = {
        schedule: cronInfo.schedule,
        timezone: profile.timezone,
        agentId: agent.agent_key,
        message:
          cronName === "morning-weather"
            ? "Run the morning weather summary skill and send me today's weather briefing."
            : "Run the grain bids skill and send me today's cash bids from my configured elevators.",
      };
    }
  }

  // Inject alert cron entries — assign to default agent in multi-agent mode
  const alertDefaultAgent = agents.find((a) => a.is_default) || agents[0];
  if (alertDefaultAgent) {
    const alertCrons = buildAlertCronEntries(
      alertPrefs, profile.timezone, weatherEnabled, grainBidsEnabled,
      scaleTicketsEnabled, alertDefaultAgent.agent_key
    );
    Object.assign(cron, alertCrons);
  }

  // Build agents list
  const defaultAgent = agents.find((a) => a.is_default);
  const agentsList = agents.map((agent) => ({
    id: agent.agent_key,
    name: agent.display_name,
    soul: `souls/${agent.agent_key}.md`,
    groupChat: {
      mentionPatterns: [
        `@${agent.display_name}`,
        `@${agent.agent_key}`,
      ],
    },
  }));

  // Build bindings (channel → agent)
  const bindings = agents
    .filter((a) => a.discord_channel_id)
    .map((agent) => ({
      agentId: agent.agent_key,
      match: {
        channel: "discord",
        peer: { kind: "channel", id: agent.discord_channel_id },
      },
    }));

  const config: Record<string, unknown> = {
    name: "FarmClaw",
    version: "1.0.0",

    providers: {
      openrouter: {
        apiKey: openrouterApiKey,
        default: true,
      },
    },

    models: {
      default: "anthropic/claude-sonnet-4-5",
      thinking: "anthropic/claude-sonnet-4-5",
    },

    channels: {
      discord: {
        enabled: true,
        token: channel.token,
        dm: { policy: "owner" },
        configWrites: false,
      },
    },

    tools: {
      allow: [
        "read", "write", "edit", "exec", "web_search", "web_fetch", "browser",
        "message", "memory_read", "memory_write",
        "sessions_list", "sessions_history", "sessions_send",
        "sessions_spawn", "session_status", "agents_list",
        "image",
      ],
      deny: ["apply_patch", "process"],
      elevated: { enabled: false },
    },

    browser: {
      enabled: true,
      headless: true,
    },

    gateway: {
      ...(gatewayPassword ? { auth: { password: gatewayPassword } } : {}),
      bind: "127.0.0.1",
    },

    agents: {
      defaults: {
        imageModel: "anthropic/claude-sonnet-4-5",
      },
      list: agentsList,
      defaultAgent: defaultAgent?.agent_key || agentsList[0]?.id,
      bindings,
    },

    skills: {
      install: { nodeManager: "npm" },
      entries: {
        "farm-grain-bids": {
          enabled: grainBidsEnabled,
          config: {
            elevators: profile.elevator_urls,
            crops: profile.primary_crops,
          },
        },
        "farm-weather": {
          enabled: weatherEnabled,
          config: {
            latitude: profile.weather_lat,
            longitude: profile.weather_lng,
            location_name: profile.weather_location,
            timezone: profile.timezone,
          },
        },
        "farm-scale-tickets": {
          enabled: scaleTicketsEnabled,
          config: {
            crops: profile.primary_crops,
            elevators: profile.elevators,
          },
        },
        ...Object.fromEntries(
          customSkills.map((cs) => [
            cs.slug,
            { enabled: true, config: cs.config },
          ])
        ),
      },
    },

    ...(mcpServers ? { mcpServers } : {}),

    cron,

    // Native OpenClaw memory remains enabled in all modes.
    // Hybrid local-vault behavior is controlled via runtime env vars.
    memory: {
      enabled: true,
      ...(hasKnowledgeFiles
        ? { memorySearch: { extraPaths: ["/home/node/knowledge"] } }
        : {}),
    },
  };

  return config;
}

export function encodeConfigForEnv(config: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(config, null, 2)).toString("base64");
}
