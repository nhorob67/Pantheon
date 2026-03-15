import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantAgent } from "@/types/tenant-runtime";
import { getEmailIdentityById } from "@/lib/email/identity";

export async function resolveAgentForChannel(
  admin: SupabaseClient,
  tenantId: string,
  channelId: string
): Promise<TenantAgent | null> {
  // Check for agent bound to this channel
  const { data: boundAgent, error: boundError } = await admin
    .from("tenant_agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("config->>discord_channel_id", channelId)
    .maybeSingle();

  if (boundError) {
    throw new Error(`Failed to resolve agent for channel: ${boundError.message}`);
  }

  if (boundAgent) {
    return boundAgent as TenantAgent;
  }

  // Fall back to default agent
  return resolveDefaultAgent(admin, tenantId);
}

export async function resolveDefaultAgent(
  admin: SupabaseClient,
  tenantId: string
): Promise<TenantAgent | null> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve default agent: ${error.message}`);
  }

  if (data) {
    return data as TenantAgent;
  }

  // If no default agent, pick first active agent
  const { data: firstAgent, error: firstError } = await admin
    .from("tenant_agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstError) {
    throw new Error(`Failed to resolve any agent: ${firstError.message}`);
  }

  return firstAgent as TenantAgent | null;
}

export async function resolveAgentById(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string
): Promise<TenantAgent | null> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select("*")
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve agent by ID: ${error.message}`);
  }

  return data as TenantAgent | null;
}

export async function resolveAgentForEmailIdentity(
  admin: SupabaseClient,
  tenantId: string,
  identityId: string
): Promise<TenantAgent | null> {
  const identity = await getEmailIdentityById(identityId);

  if (identity?.agent_id) {
    const agent = await resolveAgentById(admin, tenantId, identity.agent_id);
    if (agent) {
      return agent;
    }
  }

  return resolveDefaultAgent(admin, tenantId);
}
