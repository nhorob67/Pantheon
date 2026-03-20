import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const TENANT_ROUTE_FILES = [
  "src/app/api/tenants/[tenantId]/context/route.ts",
  "src/app/api/tenants/[tenantId]/data-governance/route.ts",
  "src/app/api/tenants/[tenantId]/agents/route.ts",
  "src/app/api/tenants/[tenantId]/agents/[agentId]/route.ts",
  "src/app/api/tenants/[tenantId]/agents/[agentId]/email-identity/route.ts",
  "src/app/api/tenants/[tenantId]/knowledge/route.ts",
  "src/app/api/tenants/[tenantId]/knowledge/[fileId]/route.ts",
  "src/app/api/tenants/[tenantId]/memory/settings/route.ts",
  "src/app/api/tenants/[tenantId]/data-governance/route.ts",
  "src/app/api/tenants/[tenantId]/memory/checkpoint/route.ts",
  "src/app/api/tenants/[tenantId]/memory/compress/route.ts",
  "src/app/api/tenants/[tenantId]/mcp-servers/route.ts",
  "src/app/api/tenants/[tenantId]/mcp-servers/[serverId]/route.ts",
  "src/app/api/tenants/[tenantId]/composio/route.ts",
  "src/app/api/tenants/[tenantId]/composio/connect/route.ts",
  "src/app/api/tenants/[tenantId]/composio/callback/route.ts",
  "src/app/api/tenants/[tenantId]/composio/connections/route.ts",
  "src/app/api/tenants/[tenantId]/composio/toolkits/route.ts",
  "src/app/api/tenants/[tenantId]/config/route.ts",
  "src/app/api/tenants/[tenantId]/update-skills/route.ts",
  "src/app/api/tenants/[tenantId]/discord/ingress/canary/route.ts",
  "src/app/api/tenants/[tenantId]/discord/ingress/route.ts",
  "src/app/api/tenants/[tenantId]/approvals/route.ts",
  "src/app/api/tenants/[tenantId]/approvals/[approvalId]/decision/route.ts",
  "src/app/api/tenants/[tenantId]/export/route.ts",
  "src/app/api/tenants/[tenantId]/export/[exportId]/route.ts",
  "src/app/api/tenants/[tenantId]/export/[exportId]/retry/route.ts",
  "src/app/api/tenants/[tenantId]/import/dry-run/route.ts",
];

const TENANT_MUTATION_ROUTE_FILES = [
  "src/app/api/tenants/[tenantId]/agents/route.ts",
  "src/app/api/tenants/[tenantId]/agents/[agentId]/route.ts",
  "src/app/api/tenants/[tenantId]/agents/[agentId]/email-identity/route.ts",
  "src/app/api/tenants/[tenantId]/knowledge/route.ts",
  "src/app/api/tenants/[tenantId]/knowledge/[fileId]/route.ts",
  "src/app/api/tenants/[tenantId]/memory/settings/route.ts",
  "src/app/api/tenants/[tenantId]/memory/checkpoint/route.ts",
  "src/app/api/tenants/[tenantId]/memory/compress/route.ts",
  "src/app/api/tenants/[tenantId]/mcp-servers/route.ts",
  "src/app/api/tenants/[tenantId]/mcp-servers/[serverId]/route.ts",
  "src/app/api/tenants/[tenantId]/composio/route.ts",
  "src/app/api/tenants/[tenantId]/composio/connect/route.ts",
  "src/app/api/tenants/[tenantId]/composio/connections/route.ts",
  "src/app/api/tenants/[tenantId]/composio/toolkits/route.ts",
  "src/app/api/tenants/[tenantId]/config/route.ts",
  "src/app/api/tenants/[tenantId]/update-skills/route.ts",
  "src/app/api/tenants/[tenantId]/discord/ingress/canary/route.ts",
  "src/app/api/tenants/[tenantId]/discord/ingress/route.ts",
  "src/app/api/tenants/[tenantId]/approvals/[approvalId]/decision/route.ts",
  "src/app/api/tenants/[tenantId]/export/route.ts",
  "src/app/api/tenants/[tenantId]/export/[exportId]/retry/route.ts",
  "src/app/api/tenants/[tenantId]/import/dry-run/route.ts",
];

const TENANT_MANAGE_RUNTIME_ROUTE_FILES = [
  "src/app/api/tenants/[tenantId]/tools/[toolId]/route.ts",
  "src/app/api/tenants/[tenantId]/heartbeat/route.ts",
  "src/app/api/tenants/[tenantId]/heartbeat/agents/[agentId]/route.ts",
  "src/app/api/tenants/[tenantId]/workflows/route.ts",
  "src/app/api/tenants/[tenantId]/workflows/[workflowId]/publish/route.ts",
  "src/app/api/tenants/[tenantId]/workflow-runs/[runId]/cancel/route.ts",
];

test("all launch-critical tenant routes use runTenantRoute wrapper", () => {
  for (const file of TENANT_ROUTE_FILES) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /runTenantRoute\s*\(/, `${file} must use runTenantRoute`);
    assert.match(
      source,
      /parseTenantRouteParams\s*\(/,
      `${file} must parse route params through parseTenantRouteParams`
    );
  }
});

test("all tenant write routes declare tenant runtime write gate", () => {
  for (const file of TENANT_MUTATION_ROUTE_FILES) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /requiredGate:\s*"writes"/,
      `${file} must enforce requiredGate: \"writes\"`
    );
  }
});

test("privileged tenant mutation routes require runtime management role", () => {
  for (const file of TENANT_MANAGE_RUNTIME_ROUTE_FILES) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /requireManageRuntimeData:\s*true/,
      `${file} must enforce requireManageRuntimeData: true`
    );
  }
});
