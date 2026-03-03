import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface FixtureState {
  userAId: string;
  userBId: string;
  customerAId: string;
  customerBId: string;
  tenantAId: string;
  tenantBId: string;
  agentAId: string;
  agentBId: string;
}

function getEnv(name: string): string {
  return process.env[name] || "";
}

function looksLikePlaceholder(name: string, value: string): boolean {
  if (!value) {
    return true;
  }

  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    return value.includes("your-project.supabase.co");
  }

  return value.includes("your-") || value.includes("example");
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const hasUsableSupabaseEnv =
  !looksLikePlaceholder("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl) &&
  !looksLikePlaceholder("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey) &&
  !looksLikePlaceholder("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);

function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAnonClient(accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string
): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message || "unknown"}`);
  }

  return data.user;
}

async function signInAndGetAccessToken(email: string, password: string): Promise<string> {
  const anon = createAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });

  if (error || !data.session?.access_token) {
    throw new Error(`Failed to sign in ${email}: ${error?.message || "no session"}`);
  }

  return data.session.access_token;
}

async function cleanupFixture(admin: SupabaseClient, fixture: Partial<FixtureState>): Promise<void> {
  const deleteById = async (table: string, id?: string) => {
    if (!id) {
      return;
    }
    await admin.from(table).delete().eq("id", id);
  };

  await deleteById("tenant_agents", fixture.agentAId);
  await deleteById("tenant_agents", fixture.agentBId);

  if (fixture.tenantAId && fixture.tenantBId) {
    await admin.from("tenant_members").delete().in("tenant_id", [fixture.tenantAId, fixture.tenantBId]);
  }

  await deleteById("tenants", fixture.tenantAId);
  await deleteById("tenants", fixture.tenantBId);
  await deleteById("customers", fixture.customerAId);
  await deleteById("customers", fixture.customerBId);

  if (fixture.userAId) {
    await admin.auth.admin.deleteUser(fixture.userAId);
  }
  if (fixture.userBId) {
    await admin.auth.admin.deleteUser(fixture.userBId);
  }
}

test(
  "database RLS denies cross-tenant reads and writes for tenant runtime tables",
  { skip: !hasUsableSupabaseEnv },
  async () => {
    const admin = createAdminClient();
    const runId = randomUUID().replace(/-/g, "").slice(0, 12);
    const password = `FarmClaw!${runId}9`;

    const fixture: Partial<FixtureState> = {};

    try {
      const emailA = `tenant-rls-a-${runId}@farmclaw.test`;
      const emailB = `tenant-rls-b-${runId}@farmclaw.test`;

      const userA = await createAuthUser(admin, emailA, password);
      const userB = await createAuthUser(admin, emailB, password);

      fixture.userAId = userA.id;
      fixture.userBId = userB.id;

      fixture.customerAId = randomUUID();
      fixture.customerBId = randomUUID();

      const customerInsert = await admin.from("customers").insert([
        {
          id: fixture.customerAId,
          user_id: fixture.userAId,
          email: emailA,
          subscription_status: "active",
          plan: "standard",
        },
        {
          id: fixture.customerBId,
          user_id: fixture.userBId,
          email: emailB,
          subscription_status: "active",
          plan: "standard",
        },
      ]);

      assert.equal(customerInsert.error, null, customerInsert.error?.message);

      fixture.tenantAId = randomUUID();
      fixture.tenantBId = randomUUID();

      const tenantInsert = await admin.from("tenants").insert([
        {
          id: fixture.tenantAId,
          customer_id: fixture.customerAId,
          slug: `tenant-rls-a-${runId}`,
          name: `Tenant RLS A ${runId}`,
          status: "active",
          primary_channel_type: "discord",
        },
        {
          id: fixture.tenantBId,
          customer_id: fixture.customerBId,
          slug: `tenant-rls-b-${runId}`,
          name: `Tenant RLS B ${runId}`,
          status: "active",
          primary_channel_type: "discord",
        },
      ]);

      assert.equal(tenantInsert.error, null, tenantInsert.error?.message);

      const memberInsert = await admin.from("tenant_members").insert([
        {
          tenant_id: fixture.tenantAId,
          user_id: fixture.userAId,
          role: "owner",
          status: "active",
          invited_by: fixture.userAId,
        },
        {
          tenant_id: fixture.tenantBId,
          user_id: fixture.userBId,
          role: "owner",
          status: "active",
          invited_by: fixture.userBId,
        },
      ]);

      assert.equal(memberInsert.error, null, memberInsert.error?.message);

      fixture.agentAId = randomUUID();
      fixture.agentBId = randomUUID();

      const agentInsert = await admin.from("tenant_agents").insert([
        {
          id: fixture.agentAId,
          tenant_id: fixture.tenantAId,
          customer_id: fixture.customerAId,
          agent_key: `agent-rls-a-${runId}`,
          display_name: "Tenant RLS Agent A",
          policy_profile: "normal",
        },
        {
          id: fixture.agentBId,
          tenant_id: fixture.tenantBId,
          customer_id: fixture.customerBId,
          agent_key: `agent-rls-b-${runId}`,
          display_name: "Tenant RLS Agent B",
          policy_profile: "normal",
        },
      ]);

      assert.equal(agentInsert.error, null, agentInsert.error?.message);

      const accessTokenA = await signInAndGetAccessToken(emailA, password);
      const userAClient = createAnonClient(accessTokenA);

      const ownRead = await userAClient
        .from("tenant_agents")
        .select("id, tenant_id")
        .eq("tenant_id", fixture.tenantAId as string);

      assert.equal(ownRead.error, null, ownRead.error?.message);
      assert.equal(ownRead.data?.length, 1);
      assert.equal(ownRead.data?.[0]?.id, fixture.agentAId);

      const crossTenantRead = await userAClient
        .from("tenant_agents")
        .select("id, tenant_id")
        .eq("tenant_id", fixture.tenantBId as string);

      assert.equal(crossTenantRead.error, null, crossTenantRead.error?.message);
      assert.equal(crossTenantRead.data?.length, 0);

      const crossTenantInsert = await userAClient.from("tenant_agents").insert({
        tenant_id: fixture.tenantBId,
        customer_id: fixture.customerBId,
        agent_key: `agent-rls-denied-${runId}`,
        display_name: "Denied Cross Tenant Insert",
        policy_profile: "normal",
      });

      assert.notEqual(crossTenantInsert.error, null);
      assert.match(
        (crossTenantInsert.error?.message || "").toLowerCase(),
        /(row-level security|violates row-level security|permission denied)/
      );
    } finally {
      await cleanupFixture(admin, fixture);
    }
  }
);
