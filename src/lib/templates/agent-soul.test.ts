import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderAgentSoul, type AgentSoulData } from "./agent-soul.ts";

function baseSoulData(overrides?: Partial<AgentSoulData>): AgentSoulData {
  return {
    team_name: "Test Team",
    team_goal: "Ship great software",
    timezone: "America/Chicago",
    agent_name: "TestBot",
    role: "Test agent",
    goal: "Help with testing",
    backstory: null,
    autonomy_level: "copilot",
    can_delegate: false,
    can_receive_delegation: false,
    skills: [],
    other_agents: [],
    knowledge_files: [],
    integrations: [],
    ...overrides,
  };
}

describe("renderAgentSoul", () => {
  it("includes integration management section", () => {
    const prompt = renderAgentSoul(baseSoulData());
    assert.ok(prompt.includes("## Integration Management"));
    assert.ok(prompt.includes("integration_store_credential"));
    assert.ok(prompt.includes("integration_register"));
    assert.ok(prompt.includes("integration_api_call"));
    assert.ok(prompt.includes("integration_list"));
    assert.ok(prompt.includes("web_search"));
    assert.ok(prompt.includes("schedule_create"));
  });

  it("does not include active integrations when none configured", () => {
    const prompt = renderAgentSoul(baseSoulData({ integrations: [] }));
    assert.ok(!prompt.includes("## Active Integrations"));
  });

  it("includes active integrations when configured", () => {
    const prompt = renderAgentSoul(
      baseSoulData({
        integrations: [
          {
            slug: "discourse",
            display_name: "Community Forum",
            service_type: "discourse",
            base_url: "https://forum.example.com",
            capabilities_summary: "Topics, posts, user management",
          },
        ],
      })
    );
    assert.ok(prompt.includes("## Active Integrations"));
    assert.ok(prompt.includes("Community Forum"));
    assert.ok(prompt.includes("`discourse`"));
    assert.ok(prompt.includes("https://forum.example.com"));
    assert.ok(prompt.includes("Topics, posts, user management"));
  });

  it("includes multiple integrations", () => {
    const prompt = renderAgentSoul(
      baseSoulData({
        integrations: [
          {
            slug: "discourse",
            display_name: "Forum",
            service_type: "discourse",
            base_url: "https://forum.example.com",
            capabilities_summary: null,
          },
          {
            slug: "github",
            display_name: "GitHub Repo",
            service_type: "github",
            base_url: "https://api.github.com",
            capabilities_summary: "Issues, PRs, repos",
          },
        ],
      })
    );
    assert.ok(prompt.includes("Forum"));
    assert.ok(prompt.includes("GitHub Repo"));
    assert.ok(prompt.includes("`discourse`"));
    assert.ok(prompt.includes("`github`"));
  });
});
