import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isKillSwitchEnabled,
  resolveCustomerFeatureFlag,
} from "@/lib/queries/extensibility";

export const TENANT_RUNTIME_READS_FLAG_KEY = "tenant.runtime.reads";
export const TENANT_RUNTIME_WRITES_FLAG_KEY = "tenant.runtime.writes";
export const TENANT_DISCORD_CANARY_DISPATCH_FLAG_KEY =
  "tenant.runtime.discord_dispatch";
export const TENANT_DISCORD_INGRESS_KILL_SWITCH_KEY =
  "tenant.runtime.discord_ingress_pause";
export const TENANT_TOOL_EXECUTION_KILL_SWITCH_KEY =
  "tenant.runtime.tool_execution_pause";
export const TENANT_MEMORY_WRITES_KILL_SWITCH_KEY =
  "tenant.runtime.memory_writes_pause";
export const TENANT_AI_WORKER_FLAG_KEY = "tenant.runtime.ai_worker";

export interface TenantRuntimeGateState {
  reads_enabled: boolean;
  writes_enabled: boolean;
  discord_ingress_paused: boolean;
  tool_execution_paused: boolean;
  memory_writes_paused: boolean;
}

export async function resolveTenantRuntimeGateState(
  admin: SupabaseClient,
  customerId: string
): Promise<TenantRuntimeGateState> {
  const [
    readsEnabled,
    writesEnabled,
    discordIngressPaused,
    toolExecutionPaused,
    memoryWritesPaused,
  ] = await Promise.all([
    resolveCustomerFeatureFlag(admin, customerId, TENANT_RUNTIME_READS_FLAG_KEY),
    resolveCustomerFeatureFlag(admin, customerId, TENANT_RUNTIME_WRITES_FLAG_KEY),
    isKillSwitchEnabled(admin, TENANT_DISCORD_INGRESS_KILL_SWITCH_KEY),
    isKillSwitchEnabled(admin, TENANT_TOOL_EXECUTION_KILL_SWITCH_KEY),
    isKillSwitchEnabled(admin, TENANT_MEMORY_WRITES_KILL_SWITCH_KEY),
  ]);

  return {
    reads_enabled: readsEnabled,
    writes_enabled: writesEnabled,
    discord_ingress_paused: discordIngressPaused,
    tool_execution_paused: toolExecutionPaused,
    memory_writes_paused: memoryWritesPaused,
  };
}
