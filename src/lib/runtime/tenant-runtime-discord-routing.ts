import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";

export interface DiscordIngressRoutingInput {
  guildId: string;
  channelId: string;
  userId: string;
}

export interface DiscordIngressTenantMatch {
  tenantId: string;
  customerId: string;
  source: "tenant_agent_channel" | "legacy_agent_channel";
}

export class DiscordIngressRoutingError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function dedupeMatches(matches: DiscordIngressTenantMatch[]): DiscordIngressTenantMatch[] {
  const seen = new Set<string>();
  const output: DiscordIngressTenantMatch[] = [];
  for (const match of matches) {
    const key = `${match.tenantId}:${match.customerId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(match);
  }
  return output;
}

async function findByTenantAgentChannel(
  admin: SupabaseClient,
  channelId: string
): Promise<DiscordIngressTenantMatch[]> {
  const { data, error } = await admin
    .from("tenant_agents")
    .select("tenant_id, customer_id")
    .neq("status", "archived")
    .contains("config", { discord_channel_id: channelId })
    .limit(10);

  if (error) {
    throw new DiscordIngressRoutingError(
      500,
      safeErrorMessage(error, "Failed to resolve tenant-agent Discord channel routing")
    );
  }

  return ((data || []) as Array<{ tenant_id: string; customer_id: string }>).map((row) => ({
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    source: "tenant_agent_channel",
  }));
}

async function findByLegacyAgentChannel(
  admin: SupabaseClient,
  channelId: string
): Promise<DiscordIngressTenantMatch[]> {
  const { data: legacyAgents, error: legacyError } = await admin
    .from("agents")
    .select("instance_id, customer_id")
    .eq("discord_channel_id", channelId)
    .limit(20);

  if (legacyError) {
    throw new DiscordIngressRoutingError(
      500,
      safeErrorMessage(legacyError, "Failed to resolve legacy Discord channel routing")
    );
  }

  const instanceIds = Array.from(
    new Set(
      ((legacyAgents || []) as Array<{ instance_id: string | null }>)
        .map((agent) => agent.instance_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  if (instanceIds.length === 0) {
    return [];
  }

  const { data: mappings, error: mappingError } = await admin
    .from("instance_tenant_mappings")
    .select("tenant_id, customer_id")
    .eq("mapping_status", "active")
    .in("instance_id", instanceIds)
    .limit(20);

  if (mappingError) {
    throw new DiscordIngressRoutingError(
      500,
      safeErrorMessage(mappingError, "Failed to resolve tenant mapping from legacy instance")
    );
  }

  return ((mappings || []) as Array<{ tenant_id: string; customer_id: string }>).map(
    (row) => ({
      tenantId: row.tenant_id,
      customerId: row.customer_id,
      source: "legacy_agent_channel",
    })
  );
}

function coerceGuildId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function refineWithGuildHint(
  admin: SupabaseClient,
  guildId: string,
  matches: DiscordIngressTenantMatch[]
): Promise<DiscordIngressTenantMatch[]> {
  const tenantIds = Array.from(new Set(matches.map((match) => match.tenantId)));
  if (tenantIds.length <= 1) {
    return matches;
  }

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("tenant_id, config, external_ref")
    .eq("status", "active")
    .in("tenant_id", tenantIds)
    .limit(50);

  if (error) {
    throw new DiscordIngressRoutingError(
      500,
      safeErrorMessage(error, "Failed to refine Discord guild routing")
    );
  }

  const guildMatchedTenants = new Set<string>();
  for (const row of (data ||
    []) as Array<{ tenant_id: string; config: unknown; external_ref: string | null }>) {
    const config = row.config && typeof row.config === "object"
      ? (row.config as Record<string, unknown>)
      : {};
    const configGuildId =
      coerceGuildId(config.guild_id) ||
      coerceGuildId(config.discord_guild_id) ||
      coerceGuildId(config.server_id);
    const externalRefGuildId = coerceGuildId(row.external_ref);
    if (configGuildId === guildId || externalRefGuildId === guildId) {
      guildMatchedTenants.add(row.tenant_id);
    }
  }

  if (guildMatchedTenants.size === 0) {
    return matches;
  }

  return matches.filter((match) => guildMatchedTenants.has(match.tenantId));
}

export async function resolveTenantForDiscordIngress(
  admin: SupabaseClient,
  input: DiscordIngressRoutingInput
): Promise<DiscordIngressTenantMatch> {
  const byTenantAgent = await findByTenantAgentChannel(admin, input.channelId);
  const byLegacyAgent = await findByLegacyAgentChannel(admin, input.channelId);
  const combined = dedupeMatches([...byTenantAgent, ...byLegacyAgent]);
  if (combined.length === 0) {
    throw new DiscordIngressRoutingError(
      404,
      "No tenant mapping found for Discord guild/channel"
    );
  }

  const guildRefined = await refineWithGuildHint(admin, input.guildId, combined);
  if (guildRefined.length === 1) {
    return guildRefined[0];
  }

  throw new DiscordIngressRoutingError(409, "Discord guild/channel mapping is ambiguous", {
    guild_id: input.guildId,
    channel_id: input.channelId,
    candidate_tenant_ids: guildRefined.map((match) => match.tenantId),
  });
}
