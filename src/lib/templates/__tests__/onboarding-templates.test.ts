import test from "node:test";
import assert from "node:assert/strict";

// Agent templates replaced the old domain-specific onboarding templates.
// We inline the template data for Node-native test runner compatibility
// (path aliases like @/ are not resolved by default).

const VALID_AUTONOMY_LEVELS = new Set(["assisted", "copilot", "autopilot"]);

interface AgentTemplateDraft {
  id: string;
  label: string;
  description: string;
  suggested_name: string;
  role: string;
  goal: string;
  backstory: string;
  autonomy_level: string;
  can_delegate: boolean;
  can_receive_delegation: boolean;
  skills: string[];
}

const AGENT_TEMPLATES: AgentTemplateDraft[] = [
  {
    id: "general-assistant",
    label: "General Assistant",
    description: "Flexible first agent for triage, coordination, and everyday requests.",
    suggested_name: "Executive Assistant",
    role: "General operations assistant",
    goal: "Keep the team organized, answer routine questions, and route work to the right place.",
    backstory:
      "You are calm, structured, and concise. Summarize decisions clearly, surface blockers early, and avoid unnecessary complexity.",
    autonomy_level: "copilot",
    can_delegate: true,
    can_receive_delegation: true,
    skills: [],
  },
  {
    id: "operations-lead",
    label: "Operations Lead",
    description: "Best for execution tracking, SOP follow-through, and issue escalation.",
    suggested_name: "Operations Lead",
    role: "Operations lead",
    goal: "Track open work, keep execution moving, and make sure nothing important stalls.",
    backstory:
      "You think in priorities, dependencies, and deadlines. You are direct, operational, and focused on turning ambiguity into next actions.",
    autonomy_level: "autopilot",
    can_delegate: true,
    can_receive_delegation: true,
    skills: [],
  },
  {
    id: "research-analyst",
    label: "Research Analyst",
    description: "Good for structured research, synthesis, and knowledge-heavy questions.",
    suggested_name: "Research Analyst",
    role: "Research analyst",
    goal: "Investigate questions quickly, synthesize findings, and provide clear recommendations with caveats.",
    backstory:
      "You are methodical and evidence-oriented. When information is uncertain, say so explicitly and separate facts from inference.",
    autonomy_level: "assisted",
    can_delegate: false,
    can_receive_delegation: true,
    skills: [],
  },
  {
    id: "customer-support",
    label: "Customer Support",
    description: "Designed for inbound questions, resolution handoff, and service quality.",
    suggested_name: "Support Lead",
    role: "Customer support specialist",
    goal: "Resolve customer questions quickly, maintain a helpful tone, and escalate edge cases with enough context to unblock the team.",
    backstory:
      "You are warm, concise, and reliable. Confirm the user's need, answer with clear steps, and avoid overpromising.",
    autonomy_level: "copilot",
    can_delegate: false,
    can_receive_delegation: true,
    skills: [],
  },
];

const ONBOARDING_AGENT_TEMPLATE_IDS = [
  "general-assistant",
  "operations-lead",
  "customer-support",
];

test("all agent templates have valid autonomy levels", () => {
  for (const template of AGENT_TEMPLATES) {
    assert.ok(
      VALID_AUTONOMY_LEVELS.has(template.autonomy_level),
      `Template "${template.id}" has invalid autonomy level "${template.autonomy_level}"`
    );
  }
});

test("all agent templates have required identity fields", () => {
  for (const template of AGENT_TEMPLATES) {
    assert.ok(template.role.length >= 5, `Template "${template.id}" role too short`);
    assert.ok(template.goal.length >= 10, `Template "${template.id}" goal too short`);
    assert.ok(template.backstory.length > 0, `Template "${template.id}" missing backstory`);
    assert.ok(template.suggested_name.length >= 2, `Template "${template.id}" missing suggested_name`);
  }
});

test("all template IDs are unique", () => {
  const ids = AGENT_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("onboarding template IDs reference valid agent templates", () => {
  const validIds = new Set(AGENT_TEMPLATES.map((t) => t.id));
  for (const id of ONBOARDING_AGENT_TEMPLATE_IDS) {
    assert.ok(validIds.has(id), `Onboarding template ID "${id}" not found in AGENT_TEMPLATES`);
  }
});

test("general-assistant template has expected defaults", () => {
  const template = AGENT_TEMPLATES.find((t) => t.id === "general-assistant");
  assert.ok(template);
  assert.equal(template.autonomy_level, "copilot");
  assert.equal(template.can_delegate, true);
  assert.equal(template.can_receive_delegation, true);
  assert.deepEqual(template.skills, []);
});

test("research-analyst template is assisted and receive-only delegation", () => {
  const template = AGENT_TEMPLATES.find((t) => t.id === "research-analyst");
  assert.ok(template);
  assert.equal(template.autonomy_level, "assisted");
  assert.equal(template.can_delegate, false);
  assert.equal(template.can_receive_delegation, true);
});
