import assert from "node:assert/strict";
import test from "node:test";
import {
  DiscordGatewayConnectionManager,
} from "./tenant-runtime-discord-gateway.ts";

test("gateway manager tracks shard registrations and normalizes dedupe key", () => {
  const manager = new DiscordGatewayConnectionManager();
  manager.register({
    tenantId: "tenant-1",
    guildId: "guild-1",
    shardId: 0,
    intents: [512],
  });
  manager.register({
    tenantId: "tenant-2",
    guildId: "guild-2",
    shardId: 1,
    intents: [512, 4096],
  });

  const snapshot = manager.snapshot();
  assert.equal(snapshot.tenant_count, 2);
  assert.equal(snapshot.shards.length, 2);

  const normalized = manager.normalizeIngressEvent({
    guild_id: "guild-1",
    channel_id: "channel-1",
    user_id: "user-1",
    message_id: "msg-1",
    content: "hello",
  });

  assert.equal(typeof normalized.dedupe_key, "string");
  assert.equal(normalized.dedupe_key.length, 64);
});
