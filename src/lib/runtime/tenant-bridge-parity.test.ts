import test from "node:test";
import assert from "node:assert/strict";
import {
  mapTenantAgentToLegacy,
  mapTenantKnowledgeToLegacy,
  mapTenantMemoryOperationToLegacy,
  mapTenantMemorySettingsToLegacy,
} from "./bridge-parity.ts";

test("mapTenantAgentToLegacy preserves legacy-compatible shape and prefers legacy id", () => {
  const result = mapTenantAgentToLegacy(
    {
      id: "tenant-agent-id",
      customer_id: "customer-id",
      legacy_agent_id: "legacy-agent-id",
      agent_key: "grain-specialist",
      display_name: "Grain Specialist",
      personality_preset: "grain",
      custom_personality: null,
      discord_channel_id: "123456789012345678",
      discord_channel_name: "grain-bids",
      is_default: true,
      skills: ["farm-grain-bids"],
      cron_jobs: { "daily-grain-bids": true },
      sort_order: 0,
      created_at: "2026-02-23T00:00:00.000Z",
      updated_at: "2026-02-23T00:00:00.000Z",
    },
    "legacy-instance-id"
  );

  assert.deepEqual(result, {
    id: "legacy-agent-id",
    instance_id: "legacy-instance-id",
    customer_id: "customer-id",
    agent_key: "grain-specialist",
    display_name: "Grain Specialist",
    personality_preset: "grain",
    custom_personality: null,
    discord_channel_id: "123456789012345678",
    discord_channel_name: "grain-bids",
    is_default: true,
    skills: ["farm-grain-bids"],
    cron_jobs: { "daily-grain-bids": true },
    sort_order: 0,
    created_at: "2026-02-23T00:00:00.000Z",
    updated_at: "2026-02-23T00:00:00.000Z",
  });
});

test("mapTenantAgentToLegacy falls back to tenant id when no legacy id exists", () => {
  const result = mapTenantAgentToLegacy(
    {
      id: "tenant-agent-only-id",
      customer_id: "customer-id",
      legacy_agent_id: null,
      agent_key: "ops-agent",
      display_name: "Ops Agent",
      personality_preset: "operations",
      custom_personality: null,
      discord_channel_id: null,
      discord_channel_name: null,
      is_default: false,
      skills: [],
      cron_jobs: {},
      sort_order: 2,
      created_at: "2026-02-23T00:00:00.000Z",
      updated_at: "2026-02-23T00:00:00.000Z",
    },
    "legacy-instance-id"
  );

  assert.equal(result.id, "tenant-agent-only-id");
  assert.equal(result.instance_id, "legacy-instance-id");
});

test("mapTenantKnowledgeToLegacy preserves knowledge file parity shape", () => {
  const result = mapTenantKnowledgeToLegacy(
    {
      id: "tenant-knowledge-id",
      customer_id: "customer-id",
      legacy_knowledge_file_id: "legacy-knowledge-id",
      agent_id: "legacy-agent-id",
      file_name: "market-briefing.md",
      file_type: "md",
      file_size_bytes: 1024,
      parsed_size_bytes: 900,
      status: "active",
      error_message: null,
      created_at: "2026-02-23T00:00:00.000Z",
      updated_at: "2026-02-23T00:00:00.000Z",
    },
    "legacy-instance-id"
  );

  assert.deepEqual(result, {
    id: "legacy-knowledge-id",
    customer_id: "customer-id",
    instance_id: "legacy-instance-id",
    agent_id: "legacy-agent-id",
    file_name: "market-briefing.md",
    file_type: "md",
    file_size_bytes: 1024,
    parsed_size_bytes: 900,
    status: "active",
    error_message: null,
    created_at: "2026-02-23T00:00:00.000Z",
    updated_at: "2026-02-23T00:00:00.000Z",
  });
});

test("mapTenantKnowledgeToLegacy falls back to tenant id when no legacy id exists", () => {
  const result = mapTenantKnowledgeToLegacy(
    {
      id: "tenant-knowledge-only-id",
      customer_id: "customer-id",
      legacy_knowledge_file_id: null,
      agent_id: null,
      file_name: "notes.txt",
      file_type: "txt",
      file_size_bytes: 128,
      parsed_size_bytes: 128,
      status: "active",
      error_message: null,
      created_at: "2026-02-23T00:00:00.000Z",
      updated_at: "2026-02-23T00:00:00.000Z",
    },
    "legacy-instance-id"
  );

  assert.equal(result.id, "tenant-knowledge-only-id");
  assert.equal(result.instance_id, "legacy-instance-id");
});

test("mapTenantMemorySettingsToLegacy normalizes exclude_categories to strings", () => {
  const result = mapTenantMemorySettingsToLegacy({
    instance_id: "legacy-instance-id",
    customer_id: "customer-id",
    mode: "hybrid_local_vault",
    capture_level: "standard",
    retention_days: 30,
    exclude_categories: ["pii", 42, null, "credentials"],
    auto_checkpoint: true,
    auto_compress: false,
    updated_by: "ops@farmclaw.test",
    created_at: "2026-02-23T00:00:00.000Z",
    updated_at: "2026-02-23T00:00:00.000Z",
  });

  assert.deepEqual(result, {
    instance_id: "legacy-instance-id",
    customer_id: "customer-id",
    mode: "hybrid_local_vault",
    capture_level: "standard",
    retention_days: 30,
    exclude_categories: ["pii", "credentials"],
    auto_checkpoint: true,
    auto_compress: false,
    updated_by: "ops@farmclaw.test",
    created_at: "2026-02-23T00:00:00.000Z",
    updated_at: "2026-02-23T00:00:00.000Z",
  });
});

test("mapTenantMemoryOperationToLegacy normalizes unsupported status/type", () => {
  const result = mapTenantMemoryOperationToLegacy({
    id: "op-1",
    operation_type: "unexpected",
    status: "unknown",
    queued_at: "2026-02-23T00:00:00.000Z",
  });

  assert.deepEqual(result, {
    id: "op-1",
    operation_type: "checkpoint",
    status: "queued",
    queued_at: "2026-02-23T00:00:00.000Z",
  });
});
