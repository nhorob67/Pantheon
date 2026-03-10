"use client";

import { createContext, use, useMemo } from "react";
import type { HeartbeatConfig } from "@/types/heartbeat";
import type { HeartbeatActivityData } from "@/lib/queries/heartbeat-activity";

export interface HeartbeatAgent {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

export interface ChannelOption {
  value: string;
  label: string;
}

export interface HeartbeatConfigStat {
  config_id: string;
  recent_deliveries_24h: number;
  recent_suppressed_24h: number;
  active_issue_count: number;
}

interface HeartbeatSettingsContextValue {
  tenantId: string;
  agents: HeartbeatAgent[];
  channelOptions: ChannelOption[];
  configs: HeartbeatConfig[];
  configStats: HeartbeatConfigStat[];
  initialActivity: HeartbeatActivityData;
  labelForConfigId: (configId: string, agentId: string | null) => string;
}

const HeartbeatSettingsContext =
  createContext<HeartbeatSettingsContextValue | null>(null);

export function useHeartbeatSettings(): HeartbeatSettingsContextValue {
  const ctx = use(HeartbeatSettingsContext);
  if (!ctx) {
    throw new Error(
      "useHeartbeatSettings must be used within a HeartbeatSettingsProvider"
    );
  }
  return ctx;
}

interface HeartbeatSettingsProviderProps {
  tenantId: string;
  agents: HeartbeatAgent[];
  initialActivity: HeartbeatActivityData;
  children: React.ReactNode;
}

export function HeartbeatSettingsProvider({
  tenantId,
  agents,
  initialActivity,
  children,
}: HeartbeatSettingsProviderProps) {
  const channelOptions = useMemo(
    () =>
      Array.from(
        new Map(
          agents
            .filter((agent) => agent.discord_channel_id)
            .map((agent) => [
              agent.discord_channel_id as string,
              {
                value: agent.discord_channel_id as string,
                label: `#${agent.display_name}`,
              },
            ])
        ).values()
      ),
    [agents]
  );

  const configById = useMemo(
    () => new Map(initialActivity.configs.map((config) => [config.id, config])),
    [initialActivity.configs]
  );

  const agentNameById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.display_name])),
    [agents]
  );

  const labelForConfigId = useMemo(
    () => (configId: string, agentId: string | null): string => {
      const config = configById.get(configId);
      const effectiveAgentId = agentId ?? config?.agent_id ?? null;
      if (effectiveAgentId) {
        return agentNameById.get(effectiveAgentId) || "Agent override";
      }
      return "Tenant default";
    },
    [configById, agentNameById]
  );

  const value = useMemo<HeartbeatSettingsContextValue>(
    () => ({
      tenantId,
      agents,
      channelOptions,
      configs: initialActivity.configs,
      configStats: initialActivity.configStats,
      initialActivity,
      labelForConfigId,
    }),
    [tenantId, agents, channelOptions, initialActivity, labelForConfigId]
  );

  return (
    <HeartbeatSettingsContext value={value}>
      {children}
    </HeartbeatSettingsContext>
  );
}
