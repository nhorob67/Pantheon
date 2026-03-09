import type { HeartbeatChecks } from "@/types/heartbeat";

export interface HeartbeatExecutionConfig {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  enabled: boolean;
  interval_minutes: number;
  timezone: string;
  active_hours_start: string;
  active_hours_end: string;
  checks: HeartbeatChecks;
  custom_checks: string[];
  delivery_channel_id: string | null;
  cooldown_minutes: number;
  max_alerts_per_day: number;
  digest_enabled: boolean;
  digest_window_minutes: number;
  reminder_interval_minutes: number;
  heartbeat_instructions: string;
  last_run_at: string | null;
  next_run_at: string | null;
  effective_scope?: "all_checks" | "tenant_scoped_only" | "agent_scoped_only";
}

export function resolveEffectiveScheduledConfigs<T extends HeartbeatExecutionConfig>(
  configs: T[]
): {
  executable: T[];
  shadowedDefaults: T[];
} {
  const grouped = new Map<string, T[]>();
  for (const config of configs) {
    const group = grouped.get(config.tenant_id) || [];
    group.push(config);
    grouped.set(config.tenant_id, group);
  }

  const executable: T[] = [];
  const shadowedDefaults: T[] = [];

  for (const tenantConfigs of grouped.values()) {
    const enabledOverrides = tenantConfigs.filter(
      (config) => config.enabled && config.agent_id !== null
    );
    const defaults = tenantConfigs.filter((config) => config.agent_id === null);

    if (enabledOverrides.length > 0) {
      const enabledDefault = defaults.find((config) => config.enabled);
      if (enabledDefault) {
        executable.push({
          ...enabledDefault,
          effective_scope: "tenant_scoped_only",
        });
      }
      executable.push(
        ...enabledOverrides.map((config) => ({
          ...config,
          effective_scope: "agent_scoped_only" as const,
        }))
      );
      continue;
    }

    executable.push(
      ...tenantConfigs
        .filter((config) => config.enabled)
        .map((config) => ({
          ...config,
          effective_scope: config.agent_id ? "agent_scoped_only" : "all_checks",
        }))
    );
  }

  return { executable, shadowedDefaults };
}

export function resolveEffectiveManualConfigs<T extends HeartbeatExecutionConfig>(
  configs: T[],
  requestedConfigId?: string
): T[] {
  if (requestedConfigId) {
    const config = configs.find((entry) => entry.id === requestedConfigId);
    if (!config) {
      return [];
    }

    const tenantHasEnabledOverrides = configs.some(
      (entry) => entry.tenant_id === config.tenant_id && entry.enabled && entry.agent_id !== null
    );

    return [
      {
        ...config,
        effective_scope: config.agent_id
          ? "agent_scoped_only"
          : tenantHasEnabledOverrides
            ? "tenant_scoped_only"
            : "all_checks",
      },
    ];
  }

  return resolveEffectiveScheduledConfigs(configs).executable;
}
