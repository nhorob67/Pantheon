import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeAgentSkillReferences,
  summarizeCustomSkillsMetadata,
} from "./tenant-export-metadata.ts";

test("summarizeAgentSkillReferences computes totals and top skill names", () => {
  const summary = summarizeAgentSkillReferences([
    {
      id: "agent-a",
      skills: ["reports", "analytics", "reports"],
    },
    {
      id: "agent-b",
      skills: ["analytics", "ops"],
    },
    {
      id: "agent-c",
      skills: "invalid",
    },
  ]);

  assert.equal(summary.total_assignments, 5);
  assert.equal(summary.unique_skill_names, 3);
  assert.deepEqual(summary.top_skill_names, ["analytics", "reports", "ops"]);
});

test("summarizeCustomSkillsMetadata tracks counts by status and slug list", () => {
  const summary = summarizeCustomSkillsMetadata([
    { slug: "custom-alpha", status: "active" },
    { slug: "custom-beta", status: "draft" },
    { slug: "custom-gamma", status: "active" },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.by_status.active, 2);
  assert.equal(summary.by_status.draft, 1);
  assert.deepEqual(summary.slugs, ["custom-alpha", "custom-beta", "custom-gamma"]);
});
