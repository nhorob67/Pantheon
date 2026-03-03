import { createHash } from "node:crypto";

export interface DiscordGatewayManagerRegistration {
  tenantId: string;
  guildId: string;
  shardId: number;
  intents: number[];
}

export interface DiscordGatewayIngressEvent {
  guild_id: string;
  channel_id: string;
  user_id: string;
  message_id: string;
  content: string;
}

export interface DiscordGatewayNormalizedEvent extends DiscordGatewayIngressEvent {
  dedupe_key: string;
  normalized_at: string;
}

export interface DiscordGatewaySnapshot {
  tenant_count: number;
  shards: Array<{
    shard_id: number;
    tenant_count: number;
  }>;
}

export class DiscordGatewayConnectionManager {
  private readonly registrations = new Map<string, DiscordGatewayManagerRegistration>();

  register(registration: DiscordGatewayManagerRegistration): void {
    this.registrations.set(registration.tenantId, registration);
  }

  unregister(tenantId: string): void {
    this.registrations.delete(tenantId);
  }

  snapshot(): DiscordGatewaySnapshot {
    const byShard = new Map<number, number>();
    for (const value of this.registrations.values()) {
      byShard.set(value.shardId, (byShard.get(value.shardId) || 0) + 1);
    }

    return {
      tenant_count: this.registrations.size,
      shards: Array.from(byShard.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([shard_id, tenant_count]) => ({ shard_id, tenant_count })),
    };
  }

  normalizeIngressEvent(event: DiscordGatewayIngressEvent): DiscordGatewayNormalizedEvent {
    const dedupe_key = createHash("sha256")
      .update(`${event.guild_id}:${event.channel_id}:${event.user_id}:${event.message_id}`)
      .digest("hex");

    return {
      ...event,
      dedupe_key,
      normalized_at: new Date().toISOString(),
    };
  }
}

let globalManager: DiscordGatewayConnectionManager | null = null;

export function getDiscordGatewayConnectionManager(): DiscordGatewayConnectionManager {
  if (!globalManager) {
    globalManager = new DiscordGatewayConnectionManager();
  }
  return globalManager;
}
