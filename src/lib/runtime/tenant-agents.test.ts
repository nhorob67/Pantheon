import assert from "node:assert/strict";
import test from "node:test";
import { __tenantAgentConfigTestUtils } from "./tenant-agents.ts";

test("legacy hydration normalizes preset-backed agents into explicit runtime fields", () => {
  const config = __tenantAgentConfigTestUtils.buildTenantAgentConfigFromLegacy({
    id: "legacy-agent-1",
    instance_id: "instance-1",
    customer_id: "customer-1",
    agent_key: "ops",
    display_name: "Ops Lead",
    personality_preset: "ops",
    custom_personality: "Coordinate handoffs and keep execution moving.",
    role: "Operations lead",
    agent_goal: "Keep the team on schedule",
    autonomy_level: "autopilot",
    discord_channel_id: "123456789012345678",
    discord_channel_name: "ops",
    is_default: true,
    skills: ["dispatch"],
    cron_jobs: { morning: true },
    sort_order: 0,
    created_at: "2026-03-11T00:00:00.000Z",
    updated_at: "2026-03-11T00:00:00.000Z",
  });

  // Legacy sync fields preserved for DB compatibility
  assert.equal(config.personality_preset, "custom");
  assert.equal(config.custom_personality, "Coordinate handoffs and keep execution moving.");

  // Explicit runtime fields
  assert.equal(config.role, "Operations lead");
  assert.equal(config.autonomy_level, "autopilot");
  assert.equal(config.goal, "Keep the team on schedule");
  assert.equal(config.backstory, "Coordinate handoffs and keep execution moving.");
  assert.equal(config.discord_channel_id, "123456789012345678");
  assert.deepEqual(config.cron_jobs, { morning: true });
});

test("runtime parser always normalizes preset to 'custom' and nulls custom_personality", () => {
  const parsed = __tenantAgentConfigTestUtils.parseTenantAgentConfig({
    personality_preset: "research",
    custom_personality: "Legacy persona text",
    role: "Research analyst",
    goal: "Answer questions quickly",
    backstory: "Fact-check and cite sources.",
    autonomy_level: "assisted",
    can_delegate: true,
    can_receive_delegation: true,
  });

  // Internal DB fields normalized
  assert.equal(parsed.personality_preset, "custom");
  assert.equal(parsed.custom_personality, null);

  // Explicit runtime fields parsed correctly
  assert.equal(parsed.role, "Research analyst");
  assert.equal(parsed.goal, "Answer questions quickly");
  assert.equal(parsed.backstory, "Fact-check and cite sources.");
  assert.equal(parsed.autonomy_level, "assisted");
  assert.equal(parsed.can_delegate, true);
  assert.equal(parsed.can_receive_delegation, true);
});

test("runtime config builder mirrors backstory into legacy DB storage", () => {
  const next = __tenantAgentConfigTestUtils.buildTenantAgentConfig(
    {
      personality_preset: "sales",
      custom_personality: "Old persona",
      role: "Account manager",
      goal: "Close renewals",
      backstory: "Existing backstory",
      autonomy_level: "copilot",
      can_delegate: false,
      can_receive_delegation: false,
      cron_jobs: {},
      composio_toolkits: [],
      tool_approval_overrides: {},
    },
    {
      backstory: "Work calmly, summarize decisions, and escalate blockers.",
    }
  );

  // Legacy DB field mirrors backstory
  assert.equal(next.personality_preset, "custom");
  assert.equal(
    next.custom_personality,
    "Work calmly, summarize decisions, and escalate blockers."
  );
  assert.equal(
    next.backstory,
    "Work calmly, summarize decisions, and escalate blockers."
  );
});
