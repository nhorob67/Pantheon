import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const identitySource = readFileSync("src/lib/email/identity.ts", "utf8");
const agentRouteSource = readFileSync(
  "src/app/api/tenants/[tenantId]/agents/[agentId]/email-identity/route.ts",
  "utf8"
);
const processEmailSource = readFileSync(
  "src/trigger/process-email-ai-response.ts",
  "utf8"
);
const migrationSource = readFileSync(
  "supabase/migrations/00083_email_identity_types.sql",
  "utf8"
);

test("agent email identity data access stays tenant-scoped", () => {
  assert.match(identitySource, /getActiveAgentEmailIdentityForTenant/);
  assert.match(identitySource, /\.eq\("tenant_id", tenantId\)/);
  assert.match(agentRouteSource, /getLatestAgentEmailIdentityForTenant/);
  assert.match(
    agentRouteSource,
    /updateAgentEmailIdentitySlug\(\s*parsed\.data\.tenantId,\s*parsed\.data\.agentId/
  );
  assert.match(
    agentRouteSource,
    /deactivateAgentEmailIdentity\(\s*parsed\.data\.tenantId,\s*parsed\.data\.agentId/
  );
});

test("legacy email fallback resolves through managed team identities only", () => {
  assert.match(processEmailSource, /\.eq\("identity_type", "team"\)/);
  assert.match(processEmailSource, /\.eq\("is_active", true\)/);
});

test("email identities record a durable identity type for routing", () => {
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS identity_type TEXT/);
  assert.match(migrationSource, /identity_type IN \('team', 'agent'\)/);
  assert.match(migrationSource, /SET identity_type = 'agent'/);
});
